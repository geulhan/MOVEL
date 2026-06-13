-- 회원 로그인 이력: 권한 보완 + RPC에서 자동 기록
-- Supabase SQL Editor에서 실행하세요. (migration_033 이후)

-- 테이블 없으면 생성 (033 미적용 환경 대비)
create table if not exists public.member_login_logs (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete restrict,
  member_id uuid not null references public.members (id) on delete cascade,
  login_at timestamptz not null default now(),
  device_type text not null default 'unknown',
  created_at timestamptz not null default now()
);

create index if not exists member_login_logs_center_id_idx
  on public.member_login_logs (center_id);

create index if not exists member_login_logs_member_id_idx
  on public.member_login_logs (member_id);

create index if not exists member_login_logs_login_at_idx
  on public.member_login_logs (login_at desc);

create index if not exists member_login_logs_center_login_at_idx
  on public.member_login_logs (center_id, login_at desc);

alter table public.member_login_logs enable row level security;

drop policy if exists member_login_logs_all on public.member_login_logs;
create policy member_login_logs_all on public.member_login_logs
  for all using (true) with check (true);

grant select, insert on public.member_login_logs to anon, authenticated;

-- 로그인 이력 insert (실패해도 로그인 흐름에 영향 없음)
create or replace function public.insert_member_login_log(
  p_member_id uuid,
  p_device_type text default 'unknown'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_center_id uuid;
begin
  if p_member_id is null then
    return;
  end if;

  select m.center_id into v_center_id
  from public.members m
  where m.id = p_member_id;

  if v_center_id is null then
    select public.get_default_center_id() into v_center_id;
  end if;

  if v_center_id is null then
    return;
  end if;

  insert into public.member_login_logs (center_id, member_id, login_at, device_type)
  values (
    v_center_id,
    p_member_id,
    now(),
    coalesce(nullif(trim(p_device_type), ''), 'unknown')
  );
exception
  when others then
    null;
end;
$$;

-- 세션 복원 등 클라이언트에서 호출
create or replace function public.log_member_session_visit(
  p_member_id uuid,
  p_device_type text default 'unknown'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.insert_member_login_log(p_member_id, p_device_type);
end;
$$;

grant execute on function public.insert_member_login_log(uuid, text) to anon, authenticated;
grant execute on function public.log_member_session_visit(uuid, text) to anon, authenticated;

-- 로그인 RPC — 성공 시 이력 기록
create or replace function public.verify_member_login(
  p_phone text,
  p_password text,
  p_device_type text default 'unknown'
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
  v_center_id uuid;
begin
  select public.get_default_center_id() into v_center_id;
  if v_center_id is null then
    return json_build_object('ok', false, 'error', 'center_not_configured');
  end if;

  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if v_digits = '' or p_password is null or p_password = '' then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  select * into v_member
  from public.members
  where center_id = v_center_id
    and regexp_replace(phone, '\D', '', 'g') = v_digits;

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

  perform public.insert_member_login_log(v_member.id, p_device_type);

  return json_build_object(
    'ok', true,
    'id', v_member.id,
    'name', v_member.name,
    'phone', regexp_replace(v_member.phone, '\D', '', 'g'),
    'token', v_token
  );
end;
$$;

-- 가입 RPC — 성공 시 이력 기록
create or replace function public.register_member(
  p_name text,
  p_phone text,
  p_password text,
  p_device_type text default 'unknown'
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
  v_center_id uuid;
begin
  select public.get_default_center_id() into v_center_id;
  if v_center_id is null then
    return json_build_object('ok', false, 'error', 'center_not_configured');
  end if;

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
    where m.center_id = v_center_id
      and regexp_replace(m.phone, '\D', '', 'g') = v_digits
  ) then
    return json_build_object('ok', false, 'error', 'already_exists');
  end if;

  insert into public.members (
    center_id,
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
    v_center_id,
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

  insert into public.member_credentials (member_id, center_id, password_hash)
  values (
    v_member.id,
    v_center_id,
    extensions.crypt(p_password, extensions.gen_salt('bf'))
  )
  on conflict (member_id) do update
  set
    center_id = excluded.center_id,
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
    updated_at = now();

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  perform public.insert_member_login_log(v_member.id, p_device_type);

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

grant execute on function public.verify_member_login(text, text, text) to anon, authenticated;
grant execute on function public.register_member(text, text, text, text) to anon, authenticated;
