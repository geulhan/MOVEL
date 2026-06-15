-- 센터 soft delete 후 slug 재사용 불가 문제 수정
-- Supabase SQL Editor에서 실행하세요.

-- 1) 이미 삭제된 센터 slug 해제 (고유 제약 충돌 방지)
update public.centers c
set
  slug = c.slug || '__deleted_' || replace(c.id::text, '-', ''),
  updated_at = now()
where c.deleted_at is not null
  and position('__deleted_' in c.slug) = 0;

-- 2) 활성 센터만 slug 유일 (선택: 전역 unique 대체)
alter table public.centers drop constraint if exists centers_slug_key;

drop index if exists public.centers_slug_active_uidx;

create unique index centers_slug_active_uidx
  on public.centers (slug)
  where deleted_at is null;

-- 3) delete_center: 삭제 시 slug 변경으로 코드 즉시 재사용 가능
create or replace function public.delete_center(
  p_session_token text,
  p_center_id uuid,
  p_confirm_slug text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_center public.centers%rowtype;
  v_slug text := lower(trim(coalesce(p_confirm_slug, '')));
  v_freed_slug text;
begin
  if not exists (
    select 1
    from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  ) then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if p_center_id is null or v_slug = '' then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  select * into v_center
  from public.centers
  where id = p_center_id
    and deleted_at is null;

  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_center.slug = 'movel' then
    return json_build_object(
      'ok', false,
      'error', 'protected_center',
      'message', 'MOVEL 기본 센터는 삭제할 수 없습니다.'
    );
  end if;

  if v_center.slug <> v_slug then
    return json_build_object(
      'ok', false,
      'error', 'slug_mismatch',
      'message', '확인용 센터 코드가 일치하지 않습니다.'
    );
  end if;

  v_freed_slug := v_center.slug || '__deleted_' || replace(p_center_id::text, '-', '');

  update public.centers
  set
    status = 'inactive',
    deleted_at = now(),
    slug = v_freed_slug,
    updated_at = now()
  where id = p_center_id;

  delete from public.auth_sessions
  where center_id = p_center_id;

  update public.center_users
  set status = 'suspended', updated_at = now()
  where center_id = p_center_id;

  return json_build_object(
    'ok', true,
    'center_id', p_center_id,
    'center_slug', v_center.slug,
    'freed_slug', v_freed_slug
  );
end;
$$;

revoke all on function public.delete_center(text, uuid, text) from public;
grant execute on function public.delete_center(text, uuid, text) to anon, authenticated;

-- 4) self_register_center: DB 오류 시 명확한 응답
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
  p_agree_marketing boolean default false
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

  select id into v_plan_id
  from public.subscription_plans
  where code = 'starter' and is_active = true
  limit 1;

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
    v_today,
    v_today + 14,
    null,
    jsonb_build_object('theme', v_default_theme, 'beta_trial', true)
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
    'service_starts_at', v_today,
    'service_ends_at', v_today + 14
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

revoke all on function public.self_register_center(text, text, text, text, text, text) from public;
grant execute on function public.self_register_center(
  text, text, text, text, text, text, boolean, boolean, boolean, boolean
) to anon, authenticated;
