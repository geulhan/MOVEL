-- 메시지 크레딧 시스템 안정화 (migration_065 이후)
-- - 베타 센터 기본 30건
-- - manual_grant 거래 유형
-- - 플랫폼 수동 지급 type 분리
-- - 대시보드 최근 실패/스킵 조회

-- ---------------------------------------------------------------------------
-- 1. transaction type: manual_grant 추가
-- ---------------------------------------------------------------------------
alter table public.message_credit_transactions
  drop constraint if exists message_credit_transactions_type_check;

alter table public.message_credit_transactions
  add constraint message_credit_transactions_type_check
  check (type in ('purchase', 'usage', 'refund', 'bonus', 'manual_grant'));

-- ---------------------------------------------------------------------------
-- 2. grant_message_credits: manual_grant 지원
-- ---------------------------------------------------------------------------
create or replace function public.grant_message_credits(
  p_center_id uuid,
  p_amount integer,
  p_type text,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.message_credit_wallets%rowtype;
  v_amount integer;
  v_type text;
begin
  if p_center_id is null then
    return json_build_object('ok', false, 'error', 'invalid_center');
  end if;

  v_amount := coalesce(p_amount, 0);
  if v_amount <= 0 then
    return json_build_object('ok', false, 'error', 'invalid_amount');
  end if;

  v_type := coalesce(nullif(trim(p_type), ''), 'bonus');
  if v_type not in ('purchase', 'usage', 'refund', 'bonus', 'manual_grant') then
    return json_build_object('ok', false, 'error', 'invalid_type');
  end if;

  perform public.ensure_message_credit_wallet(p_center_id);

  select * into v_wallet
  from public.message_credit_wallets
  where center_id = p_center_id
  for update;

  update public.message_credit_wallets
  set
    balance = balance + v_amount,
    total_purchased = total_purchased + case
      when v_type in ('purchase', 'bonus', 'manual_grant') then v_amount
      else 0
    end,
    updated_at = now()
  where center_id = p_center_id
  returning * into v_wallet;

  insert into public.message_credit_transactions (
    center_id, type, amount, balance_after, description, metadata
  )
  values (
    p_center_id,
    v_type,
    v_amount,
    v_wallet.balance,
    p_description,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return json_build_object(
    'ok', true,
    'balance', v_wallet.balance,
    'total_purchased', v_wallet.total_purchased,
    'total_used', v_wallet.total_used
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. 베타 센터 기본 30건 (기존 50건 로직 교체)
-- ---------------------------------------------------------------------------
create or replace function public.provision_center_message_beta_credits(
  p_center_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_message_credit_wallet(p_center_id);

  insert into public.center_messaging_config (center_id, enabled)
  values (p_center_id, false)
  on conflict (center_id) do nothing;

  insert into public.center_features (center_id, feature_key, enabled)
  values (p_center_id, 'notifications', false)
  on conflict (center_id, feature_key) do update set
    enabled = false,
    updated_at = now();

  if not exists (
    select 1
    from public.message_credit_transactions mct
    where mct.center_id = p_center_id
      and mct.type in ('bonus', 'manual_grant')
      and mct.description in (
        '베타 체험 메시지 크레딧',
        '베타 체험 크레딧'
      )
  ) then
    perform public.grant_message_credits(
      p_center_id,
      30,
      'bonus',
      '베타 체험 메시지 크레딧',
      jsonb_build_object('source', 'beta_signup')
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. 크레딧 요약: 스킵 건수 포함
-- ---------------------------------------------------------------------------
create or replace function public.get_message_credit_summary(p_center_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.message_credit_wallets%rowtype;
  v_month_start timestamptz;
  v_month_used integer := 0;
  v_month_alimtalk integer := 0;
  v_month_sms integer := 0;
  v_month_failed integer := 0;
  v_month_skipped integer := 0;
begin
  if p_center_id is null then
    return json_build_object('ok', false, 'error', 'invalid_center');
  end if;

  perform public.ensure_message_credit_wallet(p_center_id);

  select * into v_wallet
  from public.message_credit_wallets
  where center_id = p_center_id;

  v_month_start := date_trunc(
    'month',
    (now() at time zone 'Asia/Seoul')::timestamp
  ) at time zone 'Asia/Seoul';

  select coalesce(sum(abs(amount)), 0)::int into v_month_used
  from public.message_credit_transactions
  where center_id = p_center_id
    and type = 'usage'
    and created_at >= v_month_start;

  select
    coalesce(count(*) filter (where channel = 'alimtalk' and status = 'sent'), 0)::int,
    coalesce(count(*) filter (where channel = 'sms' and status = 'sent'), 0)::int,
    coalesce(count(*) filter (where status = 'failed'), 0)::int,
    coalesce(count(*) filter (where status = 'skipped'), 0)::int
  into v_month_alimtalk, v_month_sms, v_month_failed, v_month_skipped
  from public.message_logs
  where center_id = p_center_id
    and created_at >= v_month_start;

  return json_build_object(
    'ok', true,
    'balance', coalesce(v_wallet.balance, 0),
    'total_purchased', coalesce(v_wallet.total_purchased, 0),
    'total_used', coalesce(v_wallet.total_used, 0),
    'month_used', v_month_used,
    'month_alimtalk', v_month_alimtalk,
    'month_sms', v_month_sms,
    'month_failed', v_month_failed,
    'month_skipped', v_month_skipped
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. 센터 관리자 대시보드: 최근 실패/스킵
-- ---------------------------------------------------------------------------
create or replace function public.get_center_message_dashboard(
  p_session_token text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_summary json;
  v_enabled boolean;
  v_recent json;
begin
  select * into v_session
  from public.verify_auth_session(p_session_token, 'center_user')
  limit 1;

  if v_session.actor_id is null or v_session.center_id is null then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if v_session.role not in ('admin', 'center_admin') then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_summary := public.get_message_credit_summary(v_session.center_id);
  select public.is_center_notifications_enabled(v_session.center_id)
  into v_enabled;

  select coalesce(
    json_agg(
      json_build_object(
        'id', ml.id,
        'template_key', ml.template_key,
        'status', ml.status,
        'error_message', ml.error_message,
        'created_at', ml.created_at
      )
      order by ml.created_at desc
    ),
    '[]'::json
  )
  into v_recent
  from (
    select id, template_key, status, error_message, created_at
    from public.message_logs
    where center_id = v_session.center_id
      and status in ('failed', 'skipped')
    order by created_at desc
    limit 10
  ) ml;

  return json_build_object(
    'ok', true,
    'notifications_enabled', coalesce(v_enabled, false),
    'credits', v_summary,
    'recent_issues', v_recent
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. 슈퍼관리자 수동 지급: manual_grant
-- ---------------------------------------------------------------------------
create or replace function public.grant_center_message_credits_platform(
  p_session_token text,
  p_center_id uuid,
  p_amount integer,
  p_description text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  ) then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if p_center_id is null or coalesce(p_amount, 0) <= 0 then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  return public.grant_message_credits(
    p_center_id,
    p_amount,
    'manual_grant',
    coalesce(nullif(trim(p_description), ''), 'MotionHub 수동 지급'),
    jsonb_build_object('source', 'platform_admin')
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. 플랫폼 센터 목록에 메시지 크레딧 요약 포함
-- ---------------------------------------------------------------------------
create or replace function public.list_centers_for_platform(
  p_session_token text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  ) then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  return json_build_object(
    'ok', true,
    'centers', coalesce(
      (
        select json_agg(
          json_build_object(
            'id', c.id,
            'name', c.name,
            'slug', c.slug,
            'status', c.status,
            'plan_code', sp.code,
            'contact_email', c.contact_email,
            'contact_phone', c.contact_phone,
            'member_count', (
              select count(*)::int from public.members m where m.center_id = c.id
            ),
            'trainer_count', (
              select count(*)::int
              from public.trainers t
              where t.center_id = c.id and t.is_active = true
            ),
            'service_starts_at', c.service_starts_at,
            'service_ends_at', c.service_ends_at,
            'service_period_ok', public.center_service_period_ok(c),
            'requested_service_starts_at', nullif(c.settings->>'requested_service_starts_at', ''),
            'beta_trial', coalesce((c.settings->>'beta_trial')::boolean, false),
            'created_at', c.created_at,
            'notifications_enabled', public.is_center_notifications_enabled(c.id),
            'message_credits', public.get_message_credit_summary(c.id)
          )
          order by c.created_at desc
        )
        from public.centers c
        left join public.subscription_plans sp on sp.id = c.plan_id
        where c.deleted_at is null
      ),
      '[]'::json
    )
  );
end;
$$;

revoke all on function public.grant_message_credits(uuid, integer, text, text, jsonb) from public;
revoke all on function public.get_message_credit_summary(uuid) from public;
revoke all on function public.provision_center_message_beta_credits(uuid) from public;

grant execute on function public.get_message_credit_summary(uuid) to service_role;
