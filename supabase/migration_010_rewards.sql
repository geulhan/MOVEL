-- MOVE SCORE + MOVE MILE 리워드 시스템
-- Supabase SQL Editor에서 실행 (기존 데이터 삭제 없음)

-- 소개인 연결 (members 확장)
alter table public.members
  add column if not exists referred_by_member_id uuid references public.members (id) on delete set null;

create index if not exists members_referred_by_idx
  on public.members (referred_by_member_id);

-- 지점 확장용 (SaaS) — 단일 지점은 branch_id null
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 리워드 설정 (규칙·비율 JSON, 지점별 오버라이드 가능)
create table if not exists public.reward_settings (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches (id) on delete cascade,
  setting_key text not null,
  setting_value jsonb not null default '{}',
  description text,
  updated_at timestamptz not null default now(),
  unique (branch_id, setting_key)
);

-- 회원별 잔액 캐시 (원장 reward_transactions와 동기화)
create table if not exists public.reward_balances (
  member_id uuid primary key references public.members (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete set null,
  move_score integer not null default 0 check (move_score >= 0),
  move_mile integer not null default 0 check (move_mile >= 0),
  updated_at timestamptz not null default now()
);

-- 리워드 원장 (모든 적립·사용·만료·수동조정)
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

create index if not exists reward_transactions_event_type_idx
  on public.reward_transactions (event_type);

-- MILE 유효기간 FIFO 추적 (12개월)
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

-- 일일 활동 (걸음수·Health 연동 확장)
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

create index if not exists member_daily_activity_date_idx
  on public.member_daily_activity (activity_date desc);

-- 소개 보상 중복 방지
create table if not exists public.member_referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referred_member_id uuid not null unique references public.members (id) on delete cascade,
  referrer_member_id uuid not null references public.members (id) on delete cascade,
  payment_id uuid,
  rewarded_at timestamptz not null default now()
);

-- RLS
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

-- 기본 적립 규칙 시드 (전역, branch_id null)
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
