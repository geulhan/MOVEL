-- 솔라피 검수 전 수정: 자가가입 비밀번호, 알림 템플릿 키 확장
-- Supabase SQL Editor에서 실행하세요.

-- 1) register_member: credentials INSERT ON CONFLICT (트리거 없어도 비밀번호 저장)
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

  insert into public.member_credentials (member_id, password_hash)
  values (
    v_member.id,
    extensions.crypt(p_password, extensions.gen_salt('bf'))
  )
  on conflict (member_id) do update
  set
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
    updated_at = now();

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

-- 2) message_logs: 추후 알림톡 템플릿용 키 확장
alter table public.message_logs
  drop constraint if exists message_logs_template_key_check;

alter table public.message_logs
  add constraint message_logs_template_key_check check (
    template_key in (
      'welcome',
      'payment_done',
      'renewal',
      'step_verification_result',
      'pt_reminder'
    )
  );
