-- 플랫폼: 센터 계정 연락처 수정
-- Supabase SQL Editor에서 실행하세요.

create or replace function public.update_center_user_phone_platform(
  p_session_token text,
  p_center_user_id uuid,
  p_phone text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text;
begin
  if not exists (
    select 1
    from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  ) then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if not exists (
    select 1 from public.center_users cu where cu.id = p_center_user_id
  ) then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  if length(v_digits) < 10 or length(v_digits) > 11 then
    return json_build_object(
      'ok', false,
      'error', 'invalid_phone',
      'message', '올바른 휴대전화번호를 입력해 주세요.'
    );
  end if;

  update public.center_users
  set
    phone = v_digits,
    updated_at = now()
  where id = p_center_user_id;

  return json_build_object('ok', true, 'phone', v_digits);
end;
$$;

revoke all on function public.update_center_user_phone_platform(text, uuid, text) from public;
grant execute on function public.update_center_user_phone_platform(text, uuid, text) to anon, authenticated;
