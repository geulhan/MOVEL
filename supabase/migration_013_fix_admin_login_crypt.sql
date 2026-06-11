-- Supabase pgcrypto 스키마 수정 (crypt 함수 오류 해결)
-- 오류: function crypt(text, text) does not exist
-- Supabase SQL Editor에서 실행하세요.

create extension if not exists pgcrypto with schema extensions;

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

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

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

-- admin 계정이 없으면 생성, 있으면 비밀번호 해시 재설정
insert into public.admin_users (username, password_hash)
select 'admin', extensions.crypt('mobel-admin', extensions.gen_salt('bf'))
where not exists (
  select 1 from public.admin_users where username = 'admin'
);

update public.admin_users
set password_hash = extensions.crypt('mobel-admin', extensions.gen_salt('bf'))
where username = 'admin';
