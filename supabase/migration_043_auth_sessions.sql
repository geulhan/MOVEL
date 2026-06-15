-- MotionHub SaaS: auth_sessions + 로그인 RPC 개편
-- migration_042 이후 실행

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. auth_sessions
-- ---------------------------------------------------------------------------
create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  actor_type text not null check (
    actor_type in ('platform_admin', 'center_user', 'member')
  ),
  actor_id uuid not null,
  center_id uuid references public.centers (id) on delete cascade,
  role text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists auth_sessions_actor_idx
  on public.auth_sessions (actor_type, actor_id);

create index if not exists auth_sessions_expires_idx
  on public.auth_sessions (expires_at);

alter table public.auth_sessions enable row level security;
-- policy 없음 → RPC only

-- ---------------------------------------------------------------------------
-- 2. 세션 헬퍼
-- ---------------------------------------------------------------------------
create or replace function public.hash_session_token(p_token text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex')
$$;

create or replace function public.create_auth_session(
  p_actor_type text,
  p_actor_id uuid,
  p_center_id uuid,
  p_role text,
  p_ttl_hours integer default 168
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_hash text;
begin
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := public.hash_session_token(v_token);

  insert into public.auth_sessions (
    token_hash,
    actor_type,
    actor_id,
    center_id,
    role,
    expires_at
  )
  values (
    v_hash,
    p_actor_type,
    p_actor_id,
    p_center_id,
    p_role,
    now() + make_interval(hours => greatest(p_ttl_hours, 1))
  );

  return v_token;
end;
$$;

create or replace function public.verify_auth_session(
  p_token text,
  p_actor_type text default null,
  p_role text default null
)
returns table (
  actor_id uuid,
  center_id uuid,
  role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  if p_token is null or trim(p_token) = '' then
    return;
  end if;

  v_hash := public.hash_session_token(p_token);

  return query
  select s.actor_id, s.center_id, s.role
  from public.auth_sessions s
  where s.token_hash = v_hash
    and s.expires_at > now()
    and (p_actor_type is null or s.actor_type = p_actor_type)
    and (p_role is null or s.role = p_role);
end;
$$;

create or replace function public.revoke_auth_session(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_deleted int;
begin
  if p_token is null or trim(p_token) = '' then
    return false;
  end if;

  v_hash := public.hash_session_token(p_token);

  delete from public.auth_sessions where token_hash = v_hash;
  get diagnostics v_deleted = row_count;

  return v_deleted > 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Super Admin 로그인
-- ---------------------------------------------------------------------------
create or replace function public.verify_platform_admin_login(
  p_username text,
  p_password text
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.platform_admins%rowtype;
  v_token text;
begin
  if p_username is null or trim(p_username) = '' or p_password is null or p_password = '' then
    return json_build_object('ok', false);
  end if;

  select * into v_admin
  from public.platform_admins
  where username = lower(trim(p_username))
    and is_active = true
    and password_hash = extensions.crypt(p_password, password_hash);

  if not found then
    return json_build_object('ok', false);
  end if;

  v_token := public.create_auth_session(
    'platform_admin',
    v_admin.id,
    null,
    'super_admin'
  );

  update public.platform_admins
  set updated_at = now()
  where id = v_admin.id;

  return json_build_object(
    'ok', true,
    'id', v_admin.id,
    'username', v_admin.username,
    'display_name', v_admin.display_name,
    'token', v_token,
    'role', 'super_admin'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. 센터 스태프 로그인 (center_users)
-- ---------------------------------------------------------------------------
create or replace function public.verify_admin_login(
  p_username text,
  p_password text,
  p_center_slug text default 'movel'
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
  v_slug text := lower(trim(coalesce(p_center_slug, 'movel')));
  v_role text;
begin
  if p_username is null or trim(p_username) = '' or p_password is null or p_password = '' then
    return json_build_object('ok', false);
  end if;

  select * into v_center
  from public.centers
  where slug = v_slug
    and deleted_at is null;

  if not found then
    return json_build_object('ok', false, 'error', 'center_not_found');
  end if;

  if v_center.status = 'suspended' then
    return json_build_object('ok', false, 'error', 'center_suspended');
  end if;

  if v_center.status = 'inactive' then
    return json_build_object('ok', false, 'error', 'center_inactive');
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

-- ---------------------------------------------------------------------------
-- 5. 회원 로그인/가입 — 센터 slug 지원
-- ---------------------------------------------------------------------------
create or replace function public.register_member(
  p_name text,
  p_phone text,
  p_password text,
  p_device_type text default 'unknown',
  p_center_slug text default 'movel'
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_member public.members%rowtype;
  v_digits text;
  v_token text;
  v_center_id uuid;
  v_slug text := lower(trim(coalesce(p_center_slug, 'movel')));
begin
  select id into v_center_id
  from public.centers
  where slug = v_slug
    and status = 'active'
    and deleted_at is null;

  if v_center_id is null then
    return json_build_object('ok', false, 'error', 'center_not_configured');
  end if;

  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  if trim(coalesce(p_name, '')) = '' then
    return json_build_object('ok', false, 'error', 'invalid_name');
  end if;

  if length(v_digits) <> 11 or left(v_digits, 3) <> '010' then
    return json_build_object('ok', false, 'error', 'invalid_phone');
  end if;

  if p_password is null or length(p_password) < 4 then
    return json_build_object('ok', false, 'error', 'invalid_password');
  end if;

  if exists (
    select 1 from public.members m
    where m.center_id = v_center_id
      and regexp_replace(m.phone, '\D', '', 'g') = v_digits
  ) then
    return json_build_object('ok', false, 'error', 'already_exists');
  end if;

  insert into public.members (
    center_id,
    name,
    phone,
    total_sessions,
    remaining_sessions,
    payment_amount,
    registered_at,
    expires_at,
    status
  )
  values (
    v_center_id,
    trim(p_name),
    v_digits,
    0,
    0,
    0,
    current_date,
    null,
    'active'
  )
  returning * into v_member;

  insert into public.member_credentials (member_id, center_id, password_hash)
  values (
    v_member.id,
    v_center_id,
    extensions.crypt(p_password, extensions.gen_salt('bf'))
  )
  on conflict (member_id) do update
  set
    center_id = excluded.center_id,
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
    updated_at = now();

  v_token := public.create_auth_session(
    'member',
    v_member.id,
    v_center_id,
    'member'
  );

  perform public.insert_member_login_log(v_member.id, p_device_type);

  return json_build_object(
    'ok', true,
    'id', v_member.id,
    'name', v_member.name,
    'phone', v_member.phone,
    'token', v_token,
    'center_id', v_center_id,
    'center_slug', v_slug
  );
exception
  when unique_violation then
    return json_build_object('ok', false, 'error', 'already_exists');
end;
$$;

create or replace function public.verify_member_login(
  p_phone text,
  p_password text,
  p_device_type text default 'unknown',
  p_center_slug text default 'movel'
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_member public.members%rowtype;
  v_hash text;
  v_token text;
  v_digits text;
  v_center_id uuid;
  v_slug text := lower(trim(coalesce(p_center_slug, 'movel')));
begin
  select id into v_center_id
  from public.centers
  where slug = v_slug
    and status = 'active'
    and deleted_at is null;

  if v_center_id is null then
    return json_build_object('ok', false, 'error', 'center_not_configured');
  end if;

  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if v_digits = '' or p_password is null or p_password = '' then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  select * into v_member
  from public.members
  where center_id = v_center_id
    and regexp_replace(phone, '\D', '', 'g') = v_digits;

  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  select password_hash into v_hash
  from public.member_credentials
  where member_id = v_member.id;

  if v_hash is null then
    return json_build_object('ok', false, 'error', 'no_credentials');
  end if;

  if v_hash <> extensions.crypt(p_password, v_hash) then
    return json_build_object('ok', false, 'error', 'wrong_password');
  end if;

  v_token := public.create_auth_session(
    'member',
    v_member.id,
    v_center_id,
    'member'
  );

  perform public.insert_member_login_log(v_member.id, p_device_type);

  return json_build_object(
    'ok', true,
    'id', v_member.id,
    'name', v_member.name,
    'phone', regexp_replace(v_member.phone, '\D', '', 'g'),
    'token', v_token,
    'center_id', v_center_id,
    'center_slug', v_slug
  );
end;
$$;

create or replace function public.change_member_password(
  p_phone text,
  p_old_password text,
  p_new_password text,
  p_center_slug text default 'movel'
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_member public.members%rowtype;
  v_hash text;
  v_digits text;
  v_center_id uuid;
  v_slug text := lower(trim(coalesce(p_center_slug, 'movel')));
begin
  select id into v_center_id
  from public.centers
  where slug = v_slug
    and deleted_at is null;

  if v_center_id is null then
    return json_build_object('ok', false, 'error', 'center_not_configured');
  end if;

  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  if v_digits = '' or p_old_password is null or p_new_password is null then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  if length(p_new_password) < 4 then
    return json_build_object('ok', false, 'error', 'too_short');
  end if;

  select * into v_member
  from public.members
  where center_id = v_center_id
    and regexp_replace(phone, '\D', '', 'g') = v_digits;

  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  select password_hash into v_hash
  from public.member_credentials
  where member_id = v_member.id;

  if v_hash is null or v_hash <> extensions.crypt(p_old_password, v_hash) then
    return json_build_object('ok', false, 'error', 'wrong_password');
  end if;

  update public.member_credentials
  set
    password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
    updated_at = now()
  where member_id = v_member.id;

  return json_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Super Admin — 센터 목록
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
            'member_count', (
              select count(*)::int from public.members m where m.center_id = c.id
            ),
            'trainer_count', (
              select count(*)::int
              from public.trainers t
              where t.center_id = c.id and t.is_active = true
            ),
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

revoke all on function public.verify_platform_admin_login(text, text) from public;
grant execute on function public.verify_platform_admin_login(text, text) to anon, authenticated;

revoke all on function public.verify_admin_login(text, text, text) from public;
grant execute on function public.verify_admin_login(text, text, text) to anon, authenticated;

revoke all on function public.list_centers_for_platform(text) from public;
grant execute on function public.list_centers_for_platform(text) to anon, authenticated;

revoke all on function public.revoke_auth_session(text) from public;
grant execute on function public.revoke_auth_session(text) to anon, authenticated;
