-- SaaS 1단계: centers 테이블 + 핵심 테이블 center_id
-- Supabase SQL Editor에서 실행하세요.

-- ---------------------------------------------------------------------------
-- 1. centers 테이블
-- ---------------------------------------------------------------------------
create table if not exists public.centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (
    status in ('active', 'inactive', 'suspended')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists centers_updated_at on public.centers;
create trigger centers_updated_at
  before update on public.centers
  for each row execute function public.set_updated_at();

insert into public.centers (name, slug, status)
values ('MOVEL Performance Training', 'movel', 'active')
on conflict (slug) do update
set
  name = excluded.name,
  status = excluded.status,
  updated_at = now();

create or replace function public.get_default_center_id()
returns uuid
language sql
stable
as $$
  select id
  from public.centers
  where slug = 'movel'
    and status = 'active'
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- 2. center_id 컬럼 추가 (nullable)
-- ---------------------------------------------------------------------------
alter table public.members
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.trainers
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.admin_users
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.member_credentials
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.payment_history
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.payment_requests
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.pt_schedules
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.attendance_logs
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.exercise_journals
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.member_consultations
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.member_notes
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.session_logs
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.reward_balances
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.reward_transactions
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.step_verifications
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.message_logs
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

-- ---------------------------------------------------------------------------
-- 3. 백필 (기본 센터 MOVEL)
-- ---------------------------------------------------------------------------
do $$
declare
  v_center_id uuid;
begin
  select public.get_default_center_id() into v_center_id;
  if v_center_id is null then
    raise exception 'default center (slug=movel) not found';
  end if;

  update public.members set center_id = v_center_id where center_id is null;
  update public.trainers set center_id = v_center_id where center_id is null;
  update public.admin_users set center_id = v_center_id where center_id is null;

  update public.member_credentials mc
  set center_id = m.center_id
  from public.members m
  where mc.member_id = m.id
    and mc.center_id is null;

  update public.payment_history ph
  set center_id = m.center_id
  from public.members m
  where ph.member_id = m.id
    and ph.center_id is null;

  update public.payment_requests pr
  set center_id = m.center_id
  from public.members m
  where pr.member_id = m.id
    and pr.center_id is null;

  update public.pt_schedules ps
  set center_id = m.center_id
  from public.members m
  where ps.member_id = m.id
    and ps.center_id is null;

  update public.attendance_logs al
  set center_id = m.center_id
  from public.members m
  where al.member_id = m.id
    and al.center_id is null;

  update public.exercise_journals ej
  set center_id = m.center_id
  from public.members m
  where ej.member_id = m.id
    and ej.center_id is null;

  update public.member_consultations mc
  set center_id = m.center_id
  from public.members m
  where mc.member_id = m.id
    and mc.center_id is null;

  update public.member_notes mn
  set center_id = m.center_id
  from public.members m
  where mn.member_id = m.id
    and mn.center_id is null;

  update public.session_logs sl
  set center_id = m.center_id
  from public.members m
  where sl.member_id = m.id
    and sl.center_id is null;

  update public.reward_balances rb
  set center_id = m.center_id
  from public.members m
  where rb.member_id = m.id
    and rb.center_id is null;

  update public.reward_transactions rt
  set center_id = m.center_id
  from public.members m
  where rt.member_id = m.id
    and rt.center_id is null;

  update public.step_verifications sv
  set center_id = m.center_id
  from public.members m
  where sv.member_id = m.id
    and sv.center_id is null;

  update public.message_logs ml
  set center_id = coalesce(m.center_id, v_center_id)
  from public.members m
  where ml.member_id = m.id
    and ml.center_id is null;

  update public.message_logs
  set center_id = v_center_id
  where center_id is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. NOT NULL + 인덱스
-- ---------------------------------------------------------------------------
alter table public.members alter column center_id set not null;
alter table public.trainers alter column center_id set not null;
alter table public.admin_users alter column center_id set not null;
alter table public.member_credentials alter column center_id set not null;
alter table public.payment_history alter column center_id set not null;
alter table public.payment_requests alter column center_id set not null;
alter table public.pt_schedules alter column center_id set not null;
alter table public.attendance_logs alter column center_id set not null;
alter table public.exercise_journals alter column center_id set not null;
alter table public.member_consultations alter column center_id set not null;
alter table public.member_notes alter column center_id set not null;
alter table public.session_logs alter column center_id set not null;
alter table public.reward_balances alter column center_id set not null;
alter table public.reward_transactions alter column center_id set not null;
alter table public.step_verifications alter column center_id set not null;
alter table public.message_logs alter column center_id set not null;

create index if not exists members_center_id_idx on public.members (center_id);
create index if not exists trainers_center_id_idx on public.trainers (center_id);
create index if not exists admin_users_center_id_idx on public.admin_users (center_id);
create index if not exists payment_history_center_id_idx on public.payment_history (center_id);
create index if not exists payment_requests_center_id_idx on public.payment_requests (center_id);
create index if not exists pt_schedules_center_id_idx on public.pt_schedules (center_id);
create index if not exists attendance_logs_center_id_idx on public.attendance_logs (center_id);
create index if not exists exercise_journals_center_id_idx on public.exercise_journals (center_id);
create index if not exists member_consultations_center_id_idx on public.member_consultations (center_id);
create index if not exists member_notes_center_id_idx on public.member_notes (center_id);
create index if not exists session_logs_center_id_idx on public.session_logs (center_id);
create index if not exists reward_balances_center_id_idx on public.reward_balances (center_id);
create index if not exists reward_transactions_center_id_idx on public.reward_transactions (center_id);
create index if not exists step_verifications_center_id_idx on public.step_verifications (center_id);
create index if not exists message_logs_center_id_idx on public.message_logs (center_id);

alter table public.centers enable row level security;
drop policy if exists centers_all on public.centers;
create policy centers_all on public.centers for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 5. 회원 로그인/가입 RPC — 기본 센터 범위
-- ---------------------------------------------------------------------------
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
  v_center_id uuid;
begin
  select public.get_default_center_id() into v_center_id;
  if v_center_id is null then
    return json_build_object('ok', false, 'error', 'center_not_configured');
  end if;

  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  if v_digits = '' or p_old_password is null or p_new_password is null then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  if length(p_new_password) < 4 then
    return json_build_object('ok', false, 'error', 'too_short');
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

-- 트레이너 관리자 계정 생성 시 center_id 동기화
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
  v_existing public.admin_users%rowtype;
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
    from public.admin_users
    where username = v_username
      and not (role = 'trainer' and trainer_id = p_trainer_id)
  ) then
    return json_build_object('ok', false, 'error', '이미 사용 중인 로그인 아이디입니다.');
  end if;

  select * into v_existing
  from public.admin_users
  where role = 'trainer' and trainer_id = p_trainer_id
  limit 1;

  if found then
    update public.admin_users
    set
      username = v_username,
      password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
      center_id = v_center_id
    where id = v_existing.id;

    return json_build_object(
      'ok', true,
      'id', v_existing.id,
      'username', v_username,
      'trainer_id', p_trainer_id,
      'updated', true
    );
  end if;

  insert into public.admin_users (username, password_hash, role, trainer_id, center_id)
  values (
    v_username,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    'trainer',
    p_trainer_id,
    v_center_id
  )
  returning id into v_existing.id;

  return json_build_object(
    'ok', true,
    'id', v_existing.id,
    'username', v_username,
    'trainer_id', p_trainer_id,
    'updated', false
  );
end;
$$;

-- 다음 단계 예정: members.phone 전역 UNIQUE 제거 후 UNIQUE(center_id, phone) 적용
