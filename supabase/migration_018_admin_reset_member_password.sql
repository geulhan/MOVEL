-- 관리자: 회원 비밀번호를 휴대폰 뒤 4자리로 초기화
-- Supabase SQL Editor에서 실행하세요.

create or replace function public.reset_member_password_to_default(
  p_member_id uuid
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_member public.members%rowtype;
  v_default_password text;
begin
  if p_member_id is null then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  select * into v_member from public.members where id = p_member_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  v_default_password := public.member_phone_last_four(v_member.phone);
  if length(v_default_password) < 4 then
    v_default_password := '0000';
  end if;

  insert into public.member_credentials (member_id, password_hash)
  values (
    v_member.id,
    extensions.crypt(v_default_password, extensions.gen_salt('bf'))
  )
  on conflict (member_id) do update
  set
    password_hash = extensions.crypt(
      v_default_password,
      extensions.gen_salt('bf')
    ),
    updated_at = now();

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.reset_member_password_to_default(uuid) from public;
grant execute on function public.reset_member_password_to_default(uuid) to anon, authenticated;
