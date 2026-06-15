-- MotionHub: 센터 브랜딩 (로고 + 테마)
-- migration_047 이후 실행

alter table public.centers
  add column if not exists logo_url text;

comment on column public.centers.logo_url is
  '센터 관리자 업로드 로고 URL. null이면 센터명 텍스트 브랜딩.';

-- 센터 로고 스토리지 (권장 280×80px, 최대 2MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'center-logos',
  'center-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists center_logos_storage_all on storage.objects;
create policy center_logos_storage_all on storage.objects
  for all using (bucket_id = 'center-logos')
  with check (bucket_id = 'center-logos');

-- create_center: 신규 센터 기본 테마 (로고 없음)
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

  insert into public.centers (
    name,
    slug,
    status,
    plan_id,
    contact_email,
    contact_phone,
    logo_url,
    settings
  )
  values (
    trim(p_name),
    v_slug,
    'active',
    v_plan_id,
    nullif(trim(coalesce(p_contact_email, '')), ''),
    nullif(trim(coalesce(p_contact_phone, '')), ''),
    null,
    jsonb_build_object('theme', v_default_theme)
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

create or replace function public.update_center_branding(
  p_session_token text,
  p_theme jsonb default null,
  p_logo_url text default null,
  p_clear_logo boolean default false
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_center public.centers%rowtype;
  v_settings jsonb;
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

  select * into v_center
  from public.centers
  where id = v_session.center_id
    and deleted_at is null;

  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  v_settings := coalesce(v_center.settings, '{}'::jsonb);

  if p_theme is not null then
    v_settings := jsonb_set(v_settings, '{theme}', p_theme, true);
  end if;

  update public.centers
  set
    logo_url = case
      when p_clear_logo then null
      when p_logo_url is not null then p_logo_url
      else logo_url
    end,
    settings = v_settings,
    updated_at = now()
  where id = v_center.id;

  return json_build_object(
    'ok', true,
    'center_id', v_center.id,
    'logo_url', case when p_clear_logo then null else coalesce(p_logo_url, v_center.logo_url) end,
    'theme', v_settings -> 'theme'
  );
end;
$$;

revoke all on function public.update_center_branding(text, jsonb, text, boolean) from public;
grant execute on function public.update_center_branding(text, jsonb, text, boolean) to anon, authenticated;
