-- 신규 센터 자가가입: 즉시 활성화 + 14일 체험 기간 자동 부여
-- Supabase SQL Editor에서 실행하세요.

-- PostgREST / COMMENT 오버로드 충돌 방지: 구버전 시그니처 제거
drop function if exists public.self_register_center(text, text, text, text, text, text);
drop function if exists public.self_register_center(
  text, text, text, text, text, text, boolean, boolean, boolean, boolean
);

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
  v_starts date;
  v_ends date;
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

  -- 가입 즉시 14일 체험 (희망 시작일 파라미터는 하위 호환용으로 무시)
  v_starts := v_today;
  v_ends := v_starts + 14;

  select id into v_plan_id
  from public.subscription_plans
  where code = 'starter' and is_active = true
  limit 1;

  v_settings := jsonb_build_object(
    'theme', v_default_theme,
    'beta_trial', true,
    'trial_days', 14
  );

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
    'active',
    v_plan_id,
    nullif(trim(coalesce(p_contact_email, '')), ''),
    v_phone_digits,
    v_starts,
    v_ends,
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
    'status', 'active',
    'service_starts_at', v_starts,
    'service_ends_at', v_ends,
    'trial_days', 14
  );
exception
  when unique_violation then
    return json_build_object('ok', false, 'error', 'slug_taken');
  when undefined_table then
    return json_build_object(
      'ok', false,
      'error', 'schema_outdated',
      'message', 'DB 마이그레이션이 필요합니다. migration_096을 실행해 주세요.'
    );
  when others then
    return json_build_object(
      'ok', false,
      'error', 'server_error',
      'message', SQLERRM
    );
end;
$$;

grant execute on function public.self_register_center(
  text, text, text, text, text, text, boolean, boolean, boolean, boolean, date
) to anon, authenticated;

comment on function public.self_register_center(
  text, text, text, text, text, text, boolean, boolean, boolean, boolean, date
) is
  '센터 자가가입: 즉시 active + 14일 체험(service_starts_at~service_ends_at) + beta_trial';
