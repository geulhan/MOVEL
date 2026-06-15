-- 센터 자가 가입: 승인 대기 + 희망 이용 시작일 저장
-- Supabase SQL Editor에서 실행하세요.

create or replace function public.self_register_center(
  p_name text,
  p_slug text,
  p_admin_username text,
  p_admin_password text,
  p_contact_email text default null,
  p_contact_phone text default null,
  p_agree_age boolean default false,
  p_agree_terms boolean default false,
  p_agree_privacy boolean default false,
  p_agree_marketing boolean default false,
  p_desired_service_starts_at date default null
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_center_id uuid;
  v_plan_id uuid;
  v_slug text;
  v_username text;
  v_admin_id uuid;
  v_phone_digits text;
  v_today date := public.center_local_today();
  v_settings jsonb;
  v_default_theme jsonb := jsonb_build_object(
    'sidebarBg', '#1c1c1c',
    'sidebarText', '#f5f0e8',
    'sidebarMuted', 'rgba(245,240,232,0.65)',
    'accent', '#c8b882',
    'accentDark', '#a89868',
    'mainBg', '#f5f0e8',
    'mainText', '#1c1c1c',
    'tabActiveBg', 'rgba(200,184,130,0.22)',
    'tabActiveText', '#c8b882'
  );
begin
  if trim(coalesce(p_name, '')) = '' then
    return json_build_object('ok', false, 'error', 'invalid_name');
  end if;

  v_slug := lower(trim(coalesce(p_slug, '')));
  if v_slug = '' or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    return json_build_object(
      'ok', false,
      'error', 'invalid_slug',
      'message', '센터 주소는 영문 소문자·숫자·하이픈만 사용할 수 있습니다.'
    );
  end if;

  if v_slug = 'movel' then
    return json_build_object('ok', false, 'error', 'reserved_slug');
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
  if length(v_phone_digits) <> 11 or left(v_phone_digits, 3) <> '010' then
    return json_build_object(
      'ok', false,
      'error', 'invalid_phone',
      'message', '010으로 시작하는 11자리 휴대전화번호를 입력해 주세요.'
    );
  end if;

  if coalesce(p_agree_age, false) is not true
     or coalesce(p_agree_terms, false) is not true
     or coalesce(p_agree_privacy, false) is not true then
    return json_build_object(
      'ok', false,
      'error', 'consent_required',
      'message', '필수 약관에 모두 동의해 주세요.'
    );
  end if;

  if p_desired_service_starts_at is not null
     and p_desired_service_starts_at < v_today then
    return json_build_object(
      'ok', false,
      'error', 'invalid_desired_start',
      'message', '희망 이용 시작일은 오늘 이후로 선택해 주세요.'
    );
  end if;

  select id into v_plan_id
  from public.subscription_plans
  where code = 'starter' and is_active = true
  limit 1;

  v_settings := jsonb_build_object(
    'theme', v_default_theme,
    'beta_trial', true
  );
  if p_desired_service_starts_at is not null then
    v_settings := v_settings || jsonb_build_object(
      'requested_service_starts_at', to_char(p_desired_service_starts_at, 'YYYY-MM-DD')
    );
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
    logo_url,
    settings
  )
  values (
    trim(p_name),
    v_slug,
    'inactive',
    v_plan_id,
    nullif(trim(coalesce(p_contact_email, '')), ''),
    v_phone_digits,
    null,
    null,
    null,
    v_settings
  )
  returning id into v_center_id;

  insert into public.center_features (center_id, feature_key, enabled)
  select v_center_id, f.key, coalesce((sp.features ->> f.key)::boolean, false)
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
    v_phone_digits
  )
  returning id into v_admin_id;

  insert into public.signup_consent_records (
    subject_type,
    center_id,
    center_user_id,
    name,
    phone,
    email,
    agree_age,
    agree_terms,
    agree_privacy,
    agree_marketing
  )
  values (
    'center_admin',
    v_center_id,
    v_admin_id,
    trim(p_name),
    v_phone_digits,
    nullif(trim(coalesce(p_contact_email, '')), ''),
    coalesce(p_agree_age, false),
    coalesce(p_agree_terms, false),
    coalesce(p_agree_privacy, false),
    coalesce(p_agree_marketing, false)
  );

  return json_build_object(
    'ok', true,
    'center_id', v_center_id,
    'center_slug', v_slug,
    'center_name', trim(p_name),
    'admin_user_id', v_admin_id,
    'admin_username', v_username,
    'status', 'inactive',
    'desired_service_starts_at', p_desired_service_starts_at
  );
exception
  when unique_violation then
    return json_build_object('ok', false, 'error', 'slug_taken');
  when undefined_table then
    return json_build_object(
      'ok', false,
      'error', 'schema_outdated',
      'message', 'DB 마이그레이션이 필요합니다. migration_055를 실행해 주세요.'
    );
  when others then
    return json_build_object(
      'ok', false,
      'error', 'server_error',
      'message', SQLERRM
    );
end;
$$;

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

revoke all on function public.self_register_center(text, text, text, text, text, text) from public;
grant execute on function public.self_register_center(
  text, text, text, text, text, text, boolean, boolean, boolean, boolean, date
) to anon, authenticated;
