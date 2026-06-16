-- 센터 생성 시 이용 시작·종료일 설정 + 플랫폼 목록 연락처 필드

create or replace function public.create_center(
  p_session_token text,
  p_name text,
  p_slug text,
  p_admin_username text,
  p_admin_password text,
  p_plan_code text default 'starter',
  p_contact_email text default null,
  p_contact_phone text default null,
  p_service_starts_at date default null,
  p_service_ends_at date default null
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
  v_today date := public.center_local_today();
  v_starts date;
  v_ends date;
  v_phone_digits text;
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

  v_phone_digits := regexp_replace(coalesce(p_contact_phone, ''), '\D', '', 'g');
  if v_phone_digits <> ''
     and (length(v_phone_digits) <> 11 or left(v_phone_digits, 3) <> '010') then
    return json_build_object(
      'ok', false,
      'error', 'invalid_phone',
      'message', '010으로 시작하는 11자리 휴대전화번호를 입력해 주세요.'
    );
  end if;

  v_starts := coalesce(p_service_starts_at, v_today);
  v_ends := coalesce(p_service_ends_at, v_starts + 14);

  if v_ends < v_starts then
    return json_build_object(
      'ok', false,
      'error', 'invalid_service_period',
      'message', '이용 종료일은 시작일보다 빠를 수 없습니다.'
    );
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

  insert into public.centers (
    name,
    slug,
    status,
    plan_id,
    contact_email,
    contact_phone,
    service_starts_at,
    service_ends_at,
    settings
  )
  values (
    trim(p_name),
    v_slug,
    'active',
    v_plan_id,
    nullif(trim(coalesce(p_contact_email, '')), ''),
    nullif(v_phone_digits, ''),
    v_starts,
    v_ends,
    jsonb_build_object('beta_trial', true)
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
    display_name,
    phone
  )
  values (
    v_center_id,
    'center_admin',
    v_username,
    extensions.crypt(p_admin_password, extensions.gen_salt('bf')),
    trim(p_name) || ' 관리자',
    nullif(v_phone_digits, '')
  )
  returning id into v_admin_id;

  perform public.provision_center_message_beta_credits(v_center_id);

  return json_build_object(
    'ok', true,
    'center_id', v_center_id,
    'center_slug', v_slug,
    'center_name', trim(p_name),
    'admin_user_id', v_admin_id,
    'admin_username', v_username,
    'service_starts_at', v_starts,
    'service_ends_at', v_ends
  );
exception
  when unique_violation then
    return json_build_object('ok', false, 'error', 'slug_taken');
end;
$$;

revoke all on function public.create_center(text, text, text, text, text, text, text, text, date, date) from public;
grant execute on function public.create_center(text, text, text, text, text, text, text, text, date, date) to anon, authenticated;

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
            'created_at', c.created_at
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
