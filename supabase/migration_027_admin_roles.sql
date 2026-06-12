-- 관리자 역할(admin / trainer) 및 트레이너 계정 연동
-- Supabase SQL Editor에서 실행하세요.

alter table public.admin_users
  add column if not exists role text not null default 'admin'
    check (role in ('admin', 'trainer')),
  add column if not exists trainer_id uuid references public.trainers (id) on delete set null;

create index if not exists admin_users_role_idx on public.admin_users (role);

alter table public.admin_users
  drop constraint if exists admin_users_trainer_role_check;

alter table public.admin_users
  add constraint admin_users_trainer_role_check check (
    (role = 'trainer' and trainer_id is not null)
    or (role = 'admin')
  );

create or replace function public.verify_admin_login(
  p_username text,
  p_password text
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admin_users%rowtype;
  v_trainer_name text;
  v_token text;
begin
  if p_username is null or trim(p_username) = '' or p_password is null or p_password = '' then
    return json_build_object('ok', false);
  end if;

  select * into v_admin
  from public.admin_users
  where username = p_username
    and password_hash = extensions.crypt(p_password, password_hash);

  if not found then
    return json_build_object('ok', false);
  end if;

  if v_admin.role = 'trainer' and v_admin.trainer_id is not null then
    select name into v_trainer_name
    from public.trainers
    where id = v_admin.trainer_id;
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  return json_build_object(
    'ok', true,
    'id', v_admin.id,
    'username', v_admin.username,
    'token', v_token,
    'role', v_admin.role,
    'trainer_id', v_admin.trainer_id,
    'trainer_name', v_trainer_name
  );
end;
$$;

revoke all on function public.verify_admin_login(text, text) from public;
grant execute on function public.verify_admin_login(text, text) to anon, authenticated;

-- 트레이너 로그인 계정 예시 (트레이너 ID 확인 후 trainer_id 교체)
-- insert into public.admin_users (username, password_hash, role, trainer_id)
-- select 'trainer1', extensions.crypt('change-me', extensions.gen_salt('bf')), 'trainer', t.id
-- from public.trainers t where t.name = '홍길동' limit 1;
