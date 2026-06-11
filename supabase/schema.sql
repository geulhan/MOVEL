-- 모벨 퍼포먼스 회원관리 DB 스키마
-- Supabase 대시보드 → SQL Editor 에서 이 파일 전체를 붙여넣고 Run 하세요.

create table if not exists public.trainers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  total_sessions integer not null default 0 check (total_sessions >= 0),
  remaining_sessions integer not null default 0 check (remaining_sessions >= 0),
  payment_amount numeric(12, 0) not null default 0 check (payment_amount >= 0),
  registered_at date not null default current_date,
  expires_at date,
  trainer_id uuid references public.trainers (id) on delete set null,
  trainer_name text,
  status text not null default 'active' check (status in ('active', 'dormant', 'terminated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.period_extensions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  days_added integer not null check (days_added > 0),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.session_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  deducted_at timestamptz not null default now(),
  quantity integer not null default 1 check (quantity > 0),
  remaining_after integer check (remaining_after >= 0)
);

create index if not exists members_name_idx on public.members (name);
create index if not exists members_phone_idx on public.members (phone);
create index if not exists members_status_idx on public.members (status);
create index if not exists members_trainer_name_idx on public.members (trainer_name);
create index if not exists members_trainer_id_idx on public.members (trainer_id);
create index if not exists period_extensions_member_id_idx on public.period_extensions (member_id);
create index if not exists members_registered_at_idx on public.members (registered_at);
create index if not exists members_expires_at_idx on public.members (expires_at);
create index if not exists session_logs_member_id_idx on public.session_logs (member_id);

create table if not exists public.payment_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  amount numeric(12, 0) not null default 0 check (amount >= 0),
  sessions integer not null default 0 check (sessions >= 0),
  paid_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.member_memos (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consultation_records (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  content text not null,
  consulted_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists payment_history_member_id_idx on public.payment_history (member_id);
create index if not exists member_memos_member_id_idx on public.member_memos (member_id);
create index if not exists consultation_records_member_id_idx on public.consultation_records (member_id);

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists members_updated_at on public.members;
create trigger members_updated_at
  before update on public.members
  for each row execute function public.set_updated_at();

-- Row Level Security (간단한 관리자 앱용)
alter table public.members enable row level security;
alter table public.session_logs enable row level security;

drop policy if exists "members_all" on public.members;
create policy "members_all" on public.members
  for all using (true) with check (true);

drop policy if exists "session_logs_all" on public.session_logs;
create policy "session_logs_all" on public.session_logs
  for all using (true) with check (true);

alter table public.trainers enable row level security;
alter table public.period_extensions enable row level security;

drop policy if exists "trainers_all" on public.trainers;
create policy "trainers_all" on public.trainers
  for all using (true) with check (true);

drop policy if exists "period_extensions_all" on public.period_extensions;
create policy "period_extensions_all" on public.period_extensions
  for all using (true) with check (true);

alter table public.payment_history enable row level security;
alter table public.member_memos enable row level security;
alter table public.consultation_records enable row level security;

drop policy if exists "payment_history_all" on public.payment_history;
create policy "payment_history_all" on public.payment_history
  for all using (true) with check (true);

drop policy if exists "member_memos_all" on public.member_memos;
create policy "member_memos_all" on public.member_memos
  for all using (true) with check (true);

drop policy if exists "consultation_records_all" on public.consultation_records;
create policy "consultation_records_all" on public.consultation_records
  for all using (true) with check (true);

-- PT 스케줄
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

alter table public.pt_schedules enable row level security;

drop policy if exists "pt_schedules_all" on public.pt_schedules;
create policy "pt_schedules_all" on public.pt_schedules
  for all using (true) with check (true);

-- 회원 상담 기록
create table if not exists public.member_notes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists member_notes_member_id_idx on public.member_notes (member_id);

alter table public.member_notes enable row level security;

drop policy if exists "member_notes_all" on public.member_notes;
create policy "member_notes_all" on public.member_notes
  for all using (true) with check (true);

-- 회원 상담기록 (구조화)
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

-- MOVE SCORE + MOVE MILE 리워드 (migration_010)
alter table public.members
  add column if not exists referred_by_member_id uuid references public.members (id) on delete set null;

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
  move_score integer not null default 0,
  move_mile integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.reward_transactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
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

create table if not exists public.reward_mile_lots (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  source_transaction_id uuid references public.reward_transactions (id) on delete set null,
  earned_amount integer not null,
  remaining_amount integer not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.member_daily_activity (
  member_id uuid not null references public.members (id) on delete cascade,
  activity_date date not null,
  step_count integer not null default 0,
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
