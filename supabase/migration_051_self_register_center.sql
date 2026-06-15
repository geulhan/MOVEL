-- MotionHub: 공개 센터 가입(승인 대기) + 아이디만으로 관리자 로그인
-- migration_050 이후 실행

create or replace function public.self_register_center(
  p_name text,
  p_slug text,
  p_admin_username text,
  p_admin_password text,
  p_contact_email text default null,
  p_contact_phone text default null
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
    logo_url,
    settings
  )
  values (
    trim(p_name),
    v_slug,
    'inactive',
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
    'admin_username', v_username,
    'status', 'inactive'
  );
exception
  when unique_violation then
    return json_build_object('ok', false, 'error', 'slug_taken');
end;
$$;

create or replace function public.verify_admin_login(
  p_username text,
  p_password text,
  p_center_slug text default null
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.center_users%rowtype;
  v_center public.centers%rowtype;
  v_trainer_name text;
  v_token text;
  v_slug text := nullif(lower(trim(coalesce(p_center_slug, ''))), '');
  v_role text;
  v_access json;
  v_match_count int;
begin
  if p_username is null or trim(p_username) = '' or p_password is null or p_password = '' then
    return json_build_object('ok', false);
  end if;

  if v_slug is not null then
    select * into v_center
    from public.centers
    where slug = v_slug
      and deleted_at is null;

    if not found then
      return json_build_object('ok', false, 'error', 'center_not_found');
    end if;

    v_access := public.check_center_service_access(v_center);
    if coalesce((v_access ->> 'ok')::boolean, false) is not true then
      return v_access;
    end if;

    select * into v_user
    from public.center_users
    where center_id = v_center.id
      and username = lower(trim(p_username))
      and status = 'active'
      and password_hash = extensions.crypt(p_password, password_hash);

    if not found then
      return json_build_object('ok', false);
    end if;
  else
    select count(*)::int into v_match_count
    from public.center_users cu
    join public.centers c on c.id = cu.center_id
    where cu.username = lower(trim(p_username))
      and cu.status = 'active'
      and c.deleted_at is null
      and cu.password_hash = extensions.crypt(p_password, cu.password_hash);

    if v_match_count = 0 then
      return json_build_object('ok', false);
    end if;

    if v_match_count > 1 then
      return json_build_object(
        'ok', false,
        'error', 'multiple_centers',
        'message', '동일한 아이디가 여러 센터에 있습니다. 센터 주소를 지정해 주세요.'
      );
    end if;

    select cu.* into v_user
    from public.center_users cu
    join public.centers c on c.id = cu.center_id
    where cu.username = lower(trim(p_username))
      and cu.status = 'active'
      and c.deleted_at is null
      and cu.password_hash = extensions.crypt(p_password, cu.password_hash)
    limit 1;

    if not found then
      return json_build_object('ok', false);
    end if;

    select * into v_center
    from public.centers
    where id = v_user.center_id
      and deleted_at is null;

    if not found then
      return json_build_object('ok', false, 'error', 'center_not_found');
    end if;

    v_access := public.check_center_service_access(v_center);
    if coalesce((v_access ->> 'ok')::boolean, false) is not true then
      return v_access;
    end if;
  end if;

  if v_user.role = 'trainer' and v_user.trainer_id is not null then
    select name into v_trainer_name
    from public.trainers
    where id = v_user.trainer_id;
  end if;

  v_role := case
    when v_user.role = 'trainer' then 'trainer'
    else 'admin'
  end;

  v_token := public.create_auth_session(
    'center_user',
    v_user.id,
    v_center.id,
    v_role
  );

  update public.center_users
  set last_login_at = now()
  where id = v_user.id;

  return json_build_object(
    'ok', true,
    'id', v_user.id,
    'username', v_user.username,
    'token', v_token,
    'role', v_role,
    'trainer_id', v_user.trainer_id,
    'trainer_name', v_trainer_name,
    'center_id', v_center.id,
    'center_slug', v_center.slug,
    'center_name', v_center.name
  );
end;
$$;

revoke all on function public.self_register_center(text, text, text, text, text, text) from public;
grant execute on function public.self_register_center(text, text, text, text, text, text) to anon, authenticated;
