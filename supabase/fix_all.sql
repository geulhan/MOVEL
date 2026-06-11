-- ============================================================
-- 모벨 퍼포먼스 DB 복구/설정 (기존 데이터 삭제 없음)
-- Supabase → SQL Editor → 이 파일 전체 붙여넣기 → Run
-- ============================================================

-- 1) 트레이너 테이블
create table if not exists public.trainers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) members 기본 테이블 (없을 때만 생성)
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  total_sessions integer not null default 0 check (total_sessions >= 0),
  remaining_sessions integer not null default 0 check (remaining_sessions >= 0),
  payment_amount numeric(12, 0) not null default 0 check (payment_amount >= 0),
  registered_at date not null default current_date,
  expires_at date,
  trainer_name text,
  status text not null default 'active' check (status in ('active', 'dormant', 'terminated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) members 추가 컬럼 (없으면 추가)
alter table public.members add column if not exists registered_at date default current_date;
alter table public.members add column if not exists expires_at date;
alter table public.members add column if not exists trainer_name text;
alter table public.members add column if not exists status text default 'active';
alter table public.members add column if not exists trainer_id uuid;

-- trainer_id FK (이미 있으면 무시)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'members_trainer_id_fkey'
  ) then
    alter table public.members
      add constraint members_trainer_id_fkey
      foreign key (trainer_id) references public.trainers (id) on delete set null;
  end if;
exception when others then null;
end $$;

-- 4) session_logs
create table if not exists public.session_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  deducted_at timestamptz not null default now(),
  quantity integer not null default 1 check (quantity > 0),
  remaining_after integer check (remaining_after >= 0)
);

alter table public.session_logs
  add column if not exists quantity integer not null default 1 check (quantity > 0);

alter table public.session_logs
  add column if not exists remaining_after integer check (remaining_after >= 0);

-- 5) payment_history
create table if not exists public.payment_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  amount numeric(12, 0) not null default 0 check (amount >= 0),
  sessions integer not null default 0 check (sessions >= 0),
  paid_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

-- 6) member_memos
create table if not exists public.member_memos (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7) consultation_records
create table if not exists public.consultation_records (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  content text not null,
  consulted_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- 8) period_extensions
create table if not exists public.period_extensions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  days_added integer not null check (days_added > 0),
  note text,
  created_at timestamptz not null default now()
);

-- 9) 인덱스
create index if not exists members_name_idx on public.members (name);
create index if not exists members_phone_idx on public.members (phone);
create index if not exists members_trainer_id_idx on public.members (trainer_id);
create index if not exists session_logs_member_id_idx on public.session_logs (member_id);
create index if not exists payment_history_member_id_idx on public.payment_history (member_id);
create index if not exists member_memos_member_id_idx on public.member_memos (member_id);
create index if not exists consultation_records_member_id_idx on public.consultation_records (member_id);
create index if not exists period_extensions_member_id_idx on public.period_extensions (member_id);

-- 10) 기존 trainer_name → trainers 이전
insert into public.trainers (name)
select distinct trim(trainer_name)
from public.members
where trainer_name is not null
  and trim(trainer_name) <> ''
on conflict (name) do nothing;

update public.members m
set trainer_id = t.id
from public.trainers t
where m.trainer_id is null
  and m.trainer_name is not null
  and trim(m.trainer_name) = t.name;

-- 11) registered_at / status 기본값 채우기
update public.members
set registered_at = (created_at at time zone 'Asia/Seoul')::date
where registered_at is null;

update public.members
set status = 'active'
where status is null;

-- 12) RLS + 정책 (모든 테이블 허용 - 관리자 앱용)
alter table public.members enable row level security;
alter table public.session_logs enable row level security;
alter table public.trainers enable row level security;
alter table public.payment_history enable row level security;
alter table public.member_memos enable row level security;
alter table public.consultation_records enable row level security;
alter table public.period_extensions enable row level security;

drop policy if exists "members_all" on public.members;
create policy "members_all" on public.members for all using (true) with check (true);

drop policy if exists "session_logs_all" on public.session_logs;
create policy "session_logs_all" on public.session_logs for all using (true) with check (true);

drop policy if exists "trainers_all" on public.trainers;
create policy "trainers_all" on public.trainers for all using (true) with check (true);

drop policy if exists "payment_history_all" on public.payment_history;
create policy "payment_history_all" on public.payment_history for all using (true) with check (true);

drop policy if exists "member_memos_all" on public.member_memos;
create policy "member_memos_all" on public.member_memos for all using (true) with check (true);

drop policy if exists "consultation_records_all" on public.consultation_records;
create policy "consultation_records_all" on public.consultation_records for all using (true) with check (true);

drop policy if exists "period_extensions_all" on public.period_extensions;
create policy "period_extensions_all" on public.period_extensions for all using (true) with check (true);

-- 13) 회원 포털: 운동일지 + 출석
create table if not exists public.exercise_journals (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  trained_at date not null default current_date,
  title text,
  content text not null,
  created_by text not null default 'member'
    check (created_by in ('member', 'trainer', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  method text not null default 'self'
);

create index if not exists exercise_journals_member_id_idx on public.exercise_journals (member_id);
create index if not exists attendance_logs_member_id_idx on public.attendance_logs (member_id);

alter table public.exercise_journals enable row level security;
alter table public.attendance_logs enable row level security;

drop policy if exists "exercise_journals_all" on public.exercise_journals;
create policy "exercise_journals_all" on public.exercise_journals
  for all using (true) with check (true);

drop policy if exists "attendance_logs_all" on public.attendance_logs;
create policy "attendance_logs_all" on public.attendance_logs
  for all using (true) with check (true);

-- 14) PT 스케줄
create table if not exists public.pt_schedules (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  trainer_id uuid references public.trainers (id) on delete set null,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 50 check (duration_minutes > 0),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pt_schedules_scheduled_at_idx on public.pt_schedules (scheduled_at);
create index if not exists pt_schedules_member_id_idx on public.pt_schedules (member_id);

alter table public.pt_schedules enable row level security;

drop policy if exists "pt_schedules_all" on public.pt_schedules;
create policy "pt_schedules_all" on public.pt_schedules
  for all using (true) with check (true);

-- 15) 회원 상담 기록
create table if not exists public.member_notes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists member_notes_member_id_idx on public.member_notes (member_id);
create index if not exists member_notes_created_at_idx on public.member_notes (created_at desc);

alter table public.member_notes enable row level security;

drop policy if exists "member_notes_all" on public.member_notes;
create policy "member_notes_all" on public.member_notes
  for all using (true) with check (true);

-- 16) 회원 상담기록 (구조화)
create table if not exists public.member_consultations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  consulted_at date not null default current_date,
  trainer_id uuid references public.trainers (id) on delete set null,
  trainer_name text,
  pain_status text not null default '',
  exercise_progress text not null default '',
  goals text not null default '',
  special_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_consultations_member_id_idx
  on public.member_consultations (member_id);

create index if not exists member_consultations_consulted_at_idx
  on public.member_consultations (consulted_at desc);

alter table public.member_consultations enable row level security;

drop policy if exists "member_consultations_all" on public.member_consultations;
create policy "member_consultations_all" on public.member_consultations
  for all using (true) with check (true);

-- 17) MOVE SCORE + MOVE MILE 리워드
alter table public.members
  add column if not exists referred_by_member_id uuid references public.members (id) on delete set null;

create index if not exists members_referred_by_idx
  on public.members (referred_by_member_id);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reward_settings (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches (id) on delete cascade,
  setting_key text not null,
  setting_value jsonb not null default '{}',
  description text,
  updated_at timestamptz not null default now(),
  unique (branch_id, setting_key)
);

create table if not exists public.reward_balances (
  member_id uuid primary key references public.members (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete set null,
  move_score integer not null default 0 check (move_score >= 0),
  move_mile integer not null default 0 check (move_mile >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.reward_transactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete set null,
  currency text not null check (currency in ('move_score', 'move_mile')),
  amount integer not null,
  balance_after integer not null,
  event_type text not null,
  event_key text,
  reference_type text,
  reference_id uuid,
  note text,
  expires_at timestamptz,
  metadata jsonb not null default '{}',
  created_by text default 'system',
  created_at timestamptz not null default now()
);

create unique index if not exists reward_transactions_event_key_uidx
  on public.reward_transactions (member_id, event_key)
  where event_key is not null;

create index if not exists reward_transactions_member_created_idx
  on public.reward_transactions (member_id, created_at desc);

create table if not exists public.reward_mile_lots (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  source_transaction_id uuid references public.reward_transactions (id) on delete set null,
  earned_amount integer not null check (earned_amount > 0),
  remaining_amount integer not null check (remaining_amount >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists reward_mile_lots_member_expires_idx
  on public.reward_mile_lots (member_id, expires_at);

create table if not exists public.member_daily_activity (
  member_id uuid not null references public.members (id) on delete cascade,
  activity_date date not null,
  step_count integer not null default 0 check (step_count >= 0),
  step_source text not null default 'manual',
  has_pt_attendance boolean not null default false,
  has_journal boolean not null default false,
  metadata jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (member_id, activity_date)
);

create table if not exists public.member_referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referred_member_id uuid not null unique references public.members (id) on delete cascade,
  referrer_member_id uuid not null references public.members (id) on delete cascade,
  payment_id uuid,
  rewarded_at timestamptz not null default now()
);

alter table public.branches enable row level security;
alter table public.reward_settings enable row level security;
alter table public.reward_balances enable row level security;
alter table public.reward_transactions enable row level security;
alter table public.reward_mile_lots enable row level security;
alter table public.member_daily_activity enable row level security;
alter table public.member_referral_rewards enable row level security;

drop policy if exists "branches_all" on public.branches;
create policy "branches_all" on public.branches for all using (true) with check (true);

drop policy if exists "reward_settings_all" on public.reward_settings;
create policy "reward_settings_all" on public.reward_settings for all using (true) with check (true);

drop policy if exists "reward_balances_all" on public.reward_balances;
create policy "reward_balances_all" on public.reward_balances for all using (true) with check (true);

drop policy if exists "reward_transactions_all" on public.reward_transactions;
create policy "reward_transactions_all" on public.reward_transactions for all using (true) with check (true);

drop policy if exists "reward_mile_lots_all" on public.reward_mile_lots;
create policy "reward_mile_lots_all" on public.reward_mile_lots for all using (true) with check (true);

drop policy if exists "member_daily_activity_all" on public.member_daily_activity;
create policy "member_daily_activity_all" on public.member_daily_activity for all using (true) with check (true);

drop policy if exists "member_referral_rewards_all" on public.member_referral_rewards;
create policy "member_referral_rewards_all" on public.member_referral_rewards for all using (true) with check (true);

insert into public.reward_settings (branch_id, setting_key, setting_value, description)
values
  (null, 'earn_rules', '{
    "pt_attendance": {"score": 20, "mile": 500},
    "steps_7000": {"score": 10, "mile": 300},
    "steps_10000": {"score": 15, "mile": 500},
    "steps_15000": {"score": 20, "mile": 700},
    "exercise_journal": {"score": 5, "mile": 100},
    "streak_7day": {"score": 50, "mile": 3000},
    "naver_review": {"score": 0, "mile": 2000},
    "referral_percent": 10
  }'::jsonb, 'MOVE SCORE / MOVE MILE 적립 규칙'),
  (null, 'redemption', '{"max_percent": 20}'::jsonb, '재등록 결제 시 MILE 사용 상한'),
  (null, 'mile_expiry_months', '12'::jsonb, 'MILE 유효기간(월)')
on conflict (branch_id, setting_key) do nothing;

-- 18) 걸음수 OCR 자동 인증
create table if not exists public.step_verification_codes (
  member_id uuid not null references public.members (id) on delete cascade,
  code_date date not null,
  code text not null,
  created_at timestamptz not null default now(),
  primary key (member_id, code_date)
);

create table if not exists public.step_verifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  verification_date date not null default current_date,
  image_url text not null,
  image_path text,
  expected_code text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  extracted_step_count integer,
  extracted_date date,
  extracted_time text,
  extracted_code text,
  ai_confidence numeric(5, 2),
  ocr_raw_text text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists step_verifications_member_date_approved_uidx
  on public.step_verifications (member_id, verification_date)
  where status = 'approved';

alter table public.step_verification_codes enable row level security;
alter table public.step_verifications enable row level security;

drop policy if exists "step_verification_codes_all" on public.step_verification_codes;
create policy "step_verification_codes_all" on public.step_verification_codes
  for all using (true) with check (true);

drop policy if exists "step_verifications_all" on public.step_verifications;
create policy "step_verifications_all" on public.step_verifications
  for all using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'step-verifications',
  'step-verifications',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

drop policy if exists "step_verifications_storage_all" on storage.objects;
create policy "step_verifications_storage_all" on storage.objects
  for all using (bucket_id = 'step-verifications')
  with check (bucket_id = 'step-verifications');

-- 19. 관리자 로그인 (admin_users) — Supabase extensions 스키마 사용
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

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

insert into public.admin_users (username, password_hash)
select 'admin', extensions.crypt('mobel-admin', extensions.gen_salt('bf'))
where not exists (
  select 1 from public.admin_users where username = 'admin'
);

-- 20. 회원 로그인 (member_credentials)
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.member_credentials (
  member_id uuid primary key references public.members (id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.member_credentials enable row level security;

create or replace function public.member_phone_last_four(p_phone text)
returns text
language sql
immutable
as $$
  select right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 4);
$$;

create or replace function public.create_member_credentials()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_default_password text;
begin
  v_default_password := public.member_phone_last_four(new.phone);
  if length(v_default_password) < 4 then
    v_default_password := '0000';
  end if;

  insert into public.member_credentials (member_id, password_hash)
  values (
    new.id,
    extensions.crypt(v_default_password, extensions.gen_salt('bf'))
  )
  on conflict (member_id) do nothing;

  return new;
end;
$$;

drop trigger if exists members_create_credentials on public.members;
create trigger members_create_credentials
  after insert on public.members
  for each row
  execute function public.create_member_credentials();

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
    return json_build_object('ok', false);
  end if;

  select * into v_member from public.members where phone = v_digits;
  if not found then
    return json_build_object('ok', false);
  end if;

  select password_hash into v_hash
  from public.member_credentials
  where member_id = v_member.id;

  if v_hash is null or v_hash <> extensions.crypt(p_password, v_hash) then
    return json_build_object('ok', false);
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  return json_build_object(
    'ok', true,
    'id', v_member.id,
    'name', v_member.name,
    'phone', v_member.phone,
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

  select * into v_member from public.members where phone = v_digits;
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

revoke all on function public.verify_member_login(text, text) from public;
grant execute on function public.verify_member_login(text, text) to anon, authenticated;

revoke all on function public.change_member_password(text, text, text) from public;
grant execute on function public.change_member_password(text, text, text) to anon, authenticated;

-- ========== migration_016: 알림톡/문자 발송 이력 ==========

create table if not exists public.message_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members (id) on delete set null,
  phone text not null,
  template_key text not null check (
    template_key in ('welcome', 'payment_done', 'renewal')
  ),
  channel text check (channel in ('alimtalk', 'sms', 'skipped')),
  status text not null default 'pending' check (
    status in ('pending', 'sent', 'failed', 'skipped')
  ),
  provider_message_id text,
  error_message text,
  variables jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists message_logs_member_id_idx
  on public.message_logs (member_id);
create index if not exists message_logs_template_key_idx
  on public.message_logs (template_key);
create index if not exists message_logs_created_at_idx
  on public.message_logs (created_at desc);
create index if not exists message_logs_status_idx
  on public.message_logs (status);
create index if not exists message_logs_renewal_dedup_idx
  on public.message_logs (member_id, template_key, ((metadata ->> 'days_left')))
  where template_key = 'renewal';

alter table public.message_logs enable row level security;
drop policy if exists message_logs_all on public.message_logs;
create policy message_logs_all on public.message_logs
  for all using (true) with check (true);

-- ========== migration_017: 회원 자가 가입 ==========

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

-- 완료 확인용 (회원 수 표시)
select 'members' as table_name, count(*)::int as row_count from public.members
union all
select 'trainers', count(*)::int from public.trainers;
