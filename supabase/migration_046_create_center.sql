-- MotionHub SaaS: 성장 시스템 스텁 + create_center RPC
-- migration_045 이후 실행

-- ---------------------------------------------------------------------------
-- 1. 스텁 테이블 (구현 제외, 스키마만)
-- ---------------------------------------------------------------------------
create table if not exists public.growth_points (
  member_id uuid primary key references public.members (id) on delete cascade,
  center_id uuid not null references public.centers (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.villages (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (center_id, name)
);

create table if not exists public.village_items (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  village_id uuid not null references public.villages (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  item_type text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists growth_points_center_id_idx on public.growth_points (center_id);
create index if not exists villages_center_id_idx on public.villages (center_id);
create index if not exists village_items_center_member_idx
  on public.village_items (center_id, member_id);

alter table public.growth_points enable row level security;
alter table public.villages enable row level security;
alter table public.village_items enable row level security;

drop policy if exists growth_points_all on public.growth_points;
create policy growth_points_all on public.growth_points
  for all using (true) with check (true);

drop policy if exists villages_all on public.villages;
create policy villages_all on public.villages
  for all using (true) with check (true);

drop policy if exists village_items_all on public.village_items;
create policy village_items_all on public.village_items
  for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 2. create_center RPC (Super Admin)
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

create or replace function public.suspend_center(
  p_session_token text,
  p_center_id uuid
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

  if p_center_id is null then
    return json_build_object('ok', false, 'error', 'invalid_center');
  end if;

  update public.centers
  set
    status = 'suspended',
    suspended_at = now(),
    updated_at = now()
  where id = p_center_id
    and deleted_at is null;

  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.create_center(text, text, text, text, text, text, text, text) from public;
grant execute on function public.create_center(text, text, text, text, text, text, text, text) to anon, authenticated;

revoke all on function public.suspend_center(text, uuid) from public;
grant execute on function public.suspend_center(text, uuid) to anon, authenticated;
