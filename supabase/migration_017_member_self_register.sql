-- 회원 페이지 자가 가입 (register_member RPC)
-- Supabase SQL Editor에서 실행하세요.

create or replace function public.register_member(
  p_name text,
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
  v_digits text;
  v_token text;
begin
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
    where regexp_replace(m.phone, '\D', '', 'g') = v_digits
  ) then
    return json_build_object('ok', false, 'error', 'already_exists');
  end if;

  insert into public.members (
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

  update public.member_credentials
  set
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
    updated_at = now()
  where member_id = v_member.id;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  return json_build_object(
    'ok', true,
    'id', v_member.id,
    'name', v_member.name,
    'phone', v_member.phone,
    'token', v_token
  );
exception
  when unique_violation then
    return json_build_object('ok', false, 'error', 'already_exists');
end;
$$;

revoke all on function public.register_member(text, text, text) from public;
grant execute on function public.register_member(text, text, text) to anon, authenticated;
