-- 관리자 로그인 (admin_users + pgcrypto RPC)
-- Supabase SQL Editor에서 실행하세요.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
-- anon/authenticated 직접 조회 차단 (policy 없음)

create or replace function public.verify_admin_login(
  p_username text,
  p_password text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admin_users%rowtype;
  v_token text;
begin
  if p_username is null or trim(p_username) = '' or p_password is null or p_password = '' then
    return json_build_object('ok', false);
  end if;

  select * into v_admin
  from public.admin_users
  where username = p_username
    and password_hash = crypt(p_password, password_hash);

  if not found then
    return json_build_object('ok', false);
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');

  return json_build_object(
    'ok', true,
    'id', v_admin.id,
    'username', v_admin.username,
    'token', v_token
  );
end;
$$;

revoke all on function public.verify_admin_login(text, text) from public;
grant execute on function public.verify_admin_login(text, text) to anon, authenticated;

-- 초기 관리자 (username: admin / password: mobel-admin — 배포 후 반드시 변경)
insert into public.admin_users (username, password_hash)
select 'admin', crypt('mobel-admin', gen_salt('bf'))
where not exists (
  select 1 from public.admin_users where username = 'admin'
);
