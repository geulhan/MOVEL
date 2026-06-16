-- MotionHub 메시지 크레딧 시스템 (구독 + 크레딧 분리)
-- migration_064 이후 실행

-- ---------------------------------------------------------------------------
-- 1. 테이블
-- ---------------------------------------------------------------------------
create table if not exists public.message_credit_wallets (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null unique references public.centers (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  total_purchased integer not null default 0 check (total_purchased >= 0),
  total_used integer not null default 0 check (total_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.message_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  type text not null check (
    type in ('purchase', 'usage', 'refund', 'bonus')
  ),
  amount integer not null,
  balance_after integer not null check (balance_after >= 0),
  description text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists message_credit_transactions_center_id_idx
  on public.message_credit_transactions (center_id, created_at desc);

create index if not exists message_credit_transactions_type_idx
  on public.message_credit_transactions (center_id, type);

-- 향후 충전 상품 (MVP: 가격만 관리, 구매 UI 미구현)
create table if not exists public.message_credit_products (
  id uuid primary key default gen_random_uuid(),
  quantity integer not null unique check (quantity > 0),
  label text not null,
  price numeric(12, 0) not null default 0 check (price >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.message_credit_products (quantity, label, price, sort_order)
values
  (100, '100건', 0, 1),
  (500, '500건', 0, 2),
  (1000, '1,000건', 0, 3),
  (3000, '3,000건', 0, 4)
on conflict (quantity) do nothing;

alter table public.message_credit_wallets enable row level security;
alter table public.message_credit_transactions enable row level security;
alter table public.message_credit_products enable row level security;

create policy message_credit_products_read on public.message_credit_products
  for select using (true);

drop trigger if exists message_credit_wallets_updated_at on public.message_credit_wallets;
create trigger message_credit_wallets_updated_at
  before update on public.message_credit_wallets
  for each row execute function public.set_updated_at();

drop trigger if exists message_credit_products_updated_at on public.message_credit_products;
create trigger message_credit_products_updated_at
  before update on public.message_credit_products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. 플랜: 알림톡은 구독에 포함하지 않음
-- ---------------------------------------------------------------------------
update public.subscription_plans
set features = coalesce(features, '{}'::jsonb) || '{"notifications": false}'::jsonb
where code in ('starter', 'pro', 'business');

update public.center_features
set enabled = false, updated_at = now()
where feature_key = 'notifications'
  and center_id in (
    select c.id from public.centers c
    where c.slug <> 'movel' and c.deleted_at is null
  );

-- ---------------------------------------------------------------------------
-- 3. 크레딧 헬퍼
-- ---------------------------------------------------------------------------
create or replace function public.ensure_message_credit_wallet(p_center_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_id uuid;
begin
  insert into public.message_credit_wallets (center_id)
  values (p_center_id)
  on conflict (center_id) do nothing;

  select id into v_wallet_id
  from public.message_credit_wallets
  where center_id = p_center_id;

  return v_wallet_id;
end;
$$;

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
  if v_type not in ('purchase', 'usage', 'refund', 'bonus') then
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
    total_purchased = total_purchased + case when v_type in ('purchase', 'bonus') then v_amount else 0 end,
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

create or replace function public.try_consume_message_credits(
  p_center_id uuid,
  p_amount integer,
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
begin
  if p_center_id is null then
    return json_build_object('ok', false, 'error', 'invalid_center');
  end if;

  v_amount := greatest(coalesce(p_amount, 1), 1);
  perform public.ensure_message_credit_wallet(p_center_id);

  select * into v_wallet
  from public.message_credit_wallets
  where center_id = p_center_id
  for update;

  if v_wallet.balance < v_amount then
    return json_build_object(
      'ok', false,
      'error', 'insufficient_credits',
      'message', '메시지 크레딧이 부족합니다.',
      'balance', v_wallet.balance
    );
  end if;

  update public.message_credit_wallets
  set
    balance = balance - v_amount,
    total_used = total_used + v_amount,
    updated_at = now()
  where center_id = p_center_id
  returning * into v_wallet;

  insert into public.message_credit_transactions (
    center_id, type, amount, balance_after, description, metadata
  )
  values (
    p_center_id,
    'usage',
    -v_amount,
    v_wallet.balance,
    p_description,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return json_build_object(
    'ok', true,
    'balance', v_wallet.balance,
    'consumed', v_amount
  );
end;
$$;

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
    coalesce(count(*) filter (where status = 'failed'), 0)::int
  into v_month_alimtalk, v_month_sms, v_month_failed
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
    'month_failed', v_month_failed
  );
end;
$$;

create or replace function public.is_center_notifications_enabled(p_center_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select cmc.enabled
      from public.center_messaging_config cmc
      where cmc.center_id = p_center_id
    ),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. 센터 관리자: 알림톡 ON/OFF + 크레딧 대시보드
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

  return json_build_object(
    'ok', true,
    'notifications_enabled', coalesce(v_enabled, false),
    'credits', v_summary
  );
end;
$$;

create or replace function public.update_center_notifications_enabled(
  p_session_token text,
  p_enabled boolean
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_balance integer;
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

  if coalesce(p_enabled, false) then
    perform public.ensure_message_credit_wallet(v_session.center_id);
    select balance into v_balance
    from public.message_credit_wallets
    where center_id = v_session.center_id;

    if coalesce(v_balance, 0) <= 0 then
      return json_build_object(
        'ok', false,
        'error', 'insufficient_credits',
        'message', '메시지 크레딧이 부족합니다. 크레딧 충전 후 알림톡을 사용할 수 있습니다.'
      );
    end if;
  end if;

  insert into public.center_messaging_config (center_id, enabled)
  values (v_session.center_id, coalesce(p_enabled, false))
  on conflict (center_id) do update set
    enabled = coalesce(p_enabled, false),
    updated_at = now();

  insert into public.center_features (center_id, feature_key, enabled)
  values (v_session.center_id, 'notifications', coalesce(p_enabled, false))
  on conflict (center_id, feature_key) do update set
    enabled = coalesce(p_enabled, false),
    updated_at = now();

  return public.get_center_message_dashboard(p_session_token);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. 슈퍼관리자
-- ---------------------------------------------------------------------------
create or replace function public.list_center_message_credits_for_platform(
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
        select json_agg(row_data order by row_data ->> 'center_name')
        from (
          select json_build_object(
            'center_id', c.id,
            'center_name', c.name,
            'center_slug', c.slug,
            'notifications_enabled', public.is_center_notifications_enabled(c.id),
            'credits', public.get_message_credit_summary(c.id)
          ) as row_data
          from public.centers c
          where c.deleted_at is null
        ) sub
      ),
      '[]'::json
    )
  );
end;
$$;

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
    'bonus',
    coalesce(nullif(trim(p_description), ''), 'MotionHub 수동 지급'),
    jsonb_build_object('source', 'platform_admin')
  );
end;
$$;

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
      and mct.type = 'bonus'
      and mct.description = '베타 체험 크레딧'
  ) then
    perform public.grant_message_credits(
      p_center_id,
      50,
      'bonus',
      '베타 체험 크레딧',
      jsonb_build_object('source', 'beta_signup')
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. create_center: 베타 크레딧 + 알림 기본 OFF
-- ---------------------------------------------------------------------------
create or replace function public.create_center(
  p_session_token text,
  p_name text,
  p_slug text,
  p_admin_username text,
  p_admin_password text,
  p_plan_code text default 'starter',
  p_contact_email text default null,
  p_contact_phone text default null
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_session record;
  v_center_id uuid;
  v_plan_id uuid;
  v_slug text;
  v_username text;
  v_admin_id uuid;
begin
  select * into v_session
  from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  limit 1;

  if v_session.actor_id is null then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if trim(coalesce(p_name, '')) = '' then
    return json_build_object('ok', false, 'error', 'invalid_name');
  end if;

  v_slug := lower(trim(coalesce(p_slug, '')));
  if v_slug = '' or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    return json_build_object(
      'ok', false,
      'error', 'invalid_slug',
      'message', '센터 코드는 영문 소문자·숫자·하이픈만 사용할 수 있습니다.'
    );
  end if;

  if exists (select 1 from public.centers where slug = v_slug and deleted_at is null) then
    return json_build_object('ok', false, 'error', 'slug_taken');
  end if;

  v_username := lower(trim(coalesce(p_admin_username, '')));
  if v_username = '' then
    return json_build_object('ok', false, 'error', 'invalid_admin_username');
  end if;

  if p_admin_password is null or length(p_admin_password) < 4 then
    return json_build_object('ok', false, 'error', 'invalid_admin_password');
  end if;

  select id into v_plan_id
  from public.subscription_plans
  where code = coalesce(nullif(trim(p_plan_code), ''), 'starter')
    and is_active = true;

  if v_plan_id is null then
    select id into v_plan_id
    from public.subscription_plans
    where code = 'starter'
    limit 1;
  end if;

  insert into public.centers (name, slug, status, plan_id, contact_email, contact_phone)
  values (
    trim(p_name),
    v_slug,
    'active',
    v_plan_id,
    nullif(trim(coalesce(p_contact_email, '')), ''),
    nullif(trim(coalesce(p_contact_phone, '')), '')
  )
  returning id into v_center_id;

  insert into public.center_features (center_id, feature_key, enabled)
  select v_center_id, f.key,
    case
      when f.key = 'notifications' then false
      else coalesce((sp.features ->> f.key)::boolean, false)
    end
  from public.subscription_plans sp
  cross join (
    values ('mileage'), ('contracts'), ('notifications')
  ) as f(key)
  where sp.id = v_plan_id
  on conflict (center_id, feature_key) do nothing;

  insert into public.center_users (
    center_id,
    role,
    username,
    password_hash,
    display_name
  )
  values (
    v_center_id,
    'center_admin',
    v_username,
    extensions.crypt(p_admin_password, extensions.gen_salt('bf')),
    trim(p_name) || ' 관리자'
  )
  returning id into v_admin_id;

  perform public.provision_center_message_beta_credits(v_center_id);

  return json_build_object(
    'ok', true,
    'center_id', v_center_id,
    'center_slug', v_slug,
    'center_name', trim(p_name),
    'admin_user_id', v_admin_id,
    'admin_username', v_username
  );
exception
  when unique_violation then
    return json_build_object('ok', false, 'error', 'slug_taken');
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. 기존 센터 백필
-- ---------------------------------------------------------------------------
insert into public.message_credit_wallets (center_id)
select c.id
from public.centers c
where c.deleted_at is null
on conflict (center_id) do nothing;

-- MOVEL 운영 연속성: 레거시 센터 크레딧
select public.grant_message_credits(
  c.id,
  5000,
  'bonus',
  'MOVEL 레거시 운영 크레딧',
  '{"source":"migration_backfill"}'::jsonb
)
from public.centers c
where c.slug = 'movel'
  and c.deleted_at is null
  and not exists (
    select 1 from public.message_credit_transactions t
    where t.center_id = c.id
      and t.description = 'MOVEL 레거시 운영 크레딧'
  );

-- 기타 기존 센터: 베타 체험 50건 (미지급 센터만)
select public.provision_center_message_beta_credits(c.id)
from public.centers c
where c.deleted_at is null
  and c.slug <> 'movel';

-- MOVEL: 알림톡 기본 ON (기존 자동발송 유지)
insert into public.center_messaging_config (center_id, enabled)
select c.id, true
from public.centers c
where c.slug = 'movel' and c.deleted_at is null
on conflict (center_id) do update set enabled = true, updated_at = now();

update public.center_features
set enabled = true, updated_at = now()
where feature_key = 'notifications'
  and center_id in (
    select id from public.centers where slug = 'movel' and deleted_at is null
  );

revoke all on function public.ensure_message_credit_wallet(uuid) from public;
revoke all on function public.grant_message_credits(uuid, integer, text, text, jsonb) from public;
revoke all on function public.try_consume_message_credits(uuid, integer, text, jsonb) from public;
revoke all on function public.get_message_credit_summary(uuid) from public;
revoke all on function public.is_center_notifications_enabled(uuid) from public;
revoke all on function public.provision_center_message_beta_credits(uuid) from public;

grant execute on function public.get_center_message_dashboard(text) to anon, authenticated;
grant execute on function public.update_center_notifications_enabled(text, boolean) to anon, authenticated;
grant execute on function public.list_center_message_credits_for_platform(text) to anon, authenticated;
grant execute on function public.grant_center_message_credits_platform(text, uuid, integer, text) to anon, authenticated;

grant execute on function public.try_consume_message_credits(uuid, integer, text, jsonb) to service_role;
grant execute on function public.get_message_credit_summary(uuid) to service_role;
grant execute on function public.is_center_notifications_enabled(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 8. 신규 센터 자동 베타 크레딧 (모든 insert 경로)
-- ---------------------------------------------------------------------------
create or replace function public.on_center_created_message_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.provision_center_message_beta_credits(new.id);
  return new;
end;
$$;

drop trigger if exists centers_message_credit_provision on public.centers;
create trigger centers_message_credit_provision
  after insert on public.centers
  for each row
  execute function public.on_center_created_message_credits();
