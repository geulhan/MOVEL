-- 회원 로그인 수정 (전화번호 정규화 + RPC 오류 코드)
-- migration_014 실행 후에도 로그인 안 될 때 실행하세요.

create extension if not exists pgcrypto with schema extensions;

-- members.phone 숫자만 저장 (010-1234-5678 → 01012345678)
update public.members
set phone = regexp_replace(phone, '\D', '', 'g')
where phone ~ '\D';

-- member_credentials 없으면 생성
insert into public.member_credentials (member_id, password_hash)
select
  m.id,
  extensions.crypt(
    case
      when length(public.member_phone_last_four(m.phone)) >= 4
        then public.member_phone_last_four(m.phone)
      else '0000'
    end,
    extensions.gen_salt('bf')
  )
from public.members m
where not exists (
  select 1 from public.member_credentials c where c.member_id = m.id
);

create or replace function public.verify_member_login(
  p_phone text,
  p_password text
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
begin
  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if v_digits = '' or p_password is null or p_password = '' then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  select * into v_member
  from public.members
  where regexp_replace(phone, '\D', '', 'g') = v_digits;

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

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  return json_build_object(
    'ok', true,
    'id', v_member.id,
    'name', v_member.name,
    'phone', regexp_replace(v_member.phone, '\D', '', 'g'),
    'token', v_token
  );
end;
$$;

create or replace function public.change_member_password(
  p_phone text,
  p_old_password text,
  p_new_password text
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
begin
  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  if v_digits = '' or p_old_password is null or p_new_password is null then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  if length(p_new_password) < 4 then
    return json_build_object('ok', false, 'error', 'too_short');
  end if;

  select * into v_member
  from public.members
  where regexp_replace(phone, '\D', '', 'g') = v_digits;

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

grant execute on function public.verify_member_login(text, text) to anon, authenticated;
grant execute on function public.change_member_password(text, text, text) to anon, authenticated;
