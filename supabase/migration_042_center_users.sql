-- MotionHub SaaS: center_users (Center Admin / Trainer)
-- admin_users 데이터 이전 + 트레이너 계정 RPC 갱신
-- migration_041 이후 실행

do $$
begin
  create type public.center_role as enum ('center_admin', 'trainer');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.center_users (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  role public.center_role not null,
  username text not null,
  password_hash text not null,
  trainer_id uuid references public.trainers (id) on delete set null,
  display_name text,
  status text not null default 'active'
    check (status in ('active', 'suspended')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (center_id, username),
  constraint center_users_trainer_check check (
    (role = 'trainer' and trainer_id is not null)
    or (role = 'center_admin')
  )
);

create index if not exists center_users_center_role_idx
  on public.center_users (center_id, role);

create unique index if not exists center_users_trainer_id_uidx
  on public.center_users (trainer_id)
  where role = 'trainer' and trainer_id is not null;

drop trigger if exists center_users_updated_at on public.center_users;
create trigger center_users_updated_at
  before update on public.center_users
  for each row execute function public.set_updated_at();

-- admin_users → center_users 이전
insert into public.center_users (
  center_id,
  role,
  username,
  password_hash,
  trainer_id,
  created_at
)
select
  au.center_id,
  case
    when au.role = 'trainer' then 'trainer'::public.center_role
    else 'center_admin'::public.center_role
  end,
  au.username,
  au.password_hash,
  au.trainer_id,
  au.created_at
from public.admin_users au
on conflict (center_id, username) do nothing;

alter table public.center_users enable row level security;
-- policy 없음 → RPC only

-- ---------------------------------------------------------------------------
-- 트레이너 계정 RPC → center_users
-- ---------------------------------------------------------------------------
create or replace function public.list_trainer_admin_accounts(
  p_center_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_center_id uuid;
begin
  v_center_id := coalesce(p_center_id, public.get_default_center_id());

  return coalesce(
    (
      select json_agg(
        json_build_object(
          'admin_user_id', cu.id,
          'center_user_id', cu.id,
          'trainer_id', cu.trainer_id,
          'username', cu.username,
          'created_at', cu.created_at
        )
        order by cu.username
      )
      from public.center_users cu
      where cu.role = 'trainer'
        and cu.trainer_id is not null
        and cu.center_id = v_center_id
    ),
    '[]'::json
  );
end;
$$;

create or replace function public.upsert_trainer_admin_account(
  p_trainer_id uuid,
  p_username text,
  p_password text
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_username text := lower(trim(p_username));
  v_existing public.center_users%rowtype;
  v_trainer_exists boolean;
  v_center_id uuid;
begin
  if p_trainer_id is null then
    return json_build_object('ok', false, 'error', '트레이너를 지정해 주세요.');
  end if;

  if v_username is null or v_username = '' then
    return json_build_object('ok', false, 'error', '로그인 아이디를 입력해 주세요.');
  end if;

  if p_password is null or length(p_password) < 4 then
    return json_build_object('ok', false, 'error', '비밀번호는 4자 이상이어야 합니다.');
  end if;

  select exists(
    select 1 from public.trainers where id = p_trainer_id and is_active = true
  ) into v_trainer_exists;

  if not v_trainer_exists then
    return json_build_object('ok', false, 'error', '활성 트레이너를 찾을 수 없습니다.');
  end if;

  select center_id into v_center_id
  from public.trainers
  where id = p_trainer_id;

  if v_center_id is null then
    select public.get_default_center_id() into v_center_id;
  end if;

  if exists (
    select 1
    from public.center_users
    where center_id = v_center_id
      and username = v_username
      and not (role = 'trainer' and trainer_id = p_trainer_id)
  ) then
    return json_build_object('ok', false, 'error', '이미 사용 중인 로그인 아이디입니다.');
  end if;

  select * into v_existing
  from public.center_users
  where role = 'trainer' and trainer_id = p_trainer_id
  limit 1;

  if found then
    update public.center_users
    set
      username = v_username,
      password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
      center_id = v_center_id,
      status = 'active'
    where id = v_existing.id;

    return json_build_object(
      'ok', true,
      'admin_user_id', v_existing.id,
      'center_user_id', v_existing.id,
      'trainer_id', p_trainer_id,
      'username', v_username,
      'created', false
    );
  end if;

  insert into public.center_users (
    center_id,
    role,
    username,
    password_hash,
    trainer_id
  )
  values (
    v_center_id,
    'trainer',
    v_username,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    p_trainer_id
  )
  returning * into v_existing;

  return json_build_object(
    'ok', true,
    'admin_user_id', v_existing.id,
    'center_user_id', v_existing.id,
    'trainer_id', p_trainer_id,
    'username', v_username,
    'created', true
  );
end;
$$;

create or replace function public.delete_trainer_admin_account(p_trainer_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  if p_trainer_id is null then
    return json_build_object('ok', false, 'error', '트레이너를 지정해 주세요.');
  end if;

  delete from public.center_users
  where role = 'trainer' and trainer_id = p_trainer_id;

  get diagnostics v_deleted = row_count;

  if v_deleted = 0 then
    return json_build_object('ok', false, 'error', '설정된 로그인 계정이 없습니다.');
  end if;

  return json_build_object('ok', true);
end;
$$;

create or replace function public.deactivate_trainer(p_trainer_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if p_trainer_id is null then
    return json_build_object('ok', false, 'error', '트레이너를 지정해 주세요.');
  end if;

  if not exists (
    select 1 from public.trainers where id = p_trainer_id and is_active = true
  ) then
    return json_build_object('ok', false, 'error', '활성 트레이너를 찾을 수 없습니다.');
  end if;

  delete from public.center_users
  where role = 'trainer' and trainer_id = p_trainer_id;

  delete from public.admin_users
  where role = 'trainer' and trainer_id = p_trainer_id;

  update public.trainers
  set is_active = false
  where id = p_trainer_id and is_active = true;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return json_build_object('ok', false, 'error', '트레이너를 찾을 수 없습니다.');
  end if;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.list_trainer_admin_accounts(uuid) from public;
grant execute on function public.list_trainer_admin_accounts(uuid) to anon, authenticated;

revoke all on function public.upsert_trainer_admin_account(uuid, text, text) from public;
grant execute on function public.upsert_trainer_admin_account(uuid, text, text) to anon, authenticated;

revoke all on function public.delete_trainer_admin_account(uuid) from public;
grant execute on function public.delete_trainer_admin_account(uuid) to anon, authenticated;
