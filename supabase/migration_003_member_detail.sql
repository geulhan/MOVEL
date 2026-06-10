-- 회원 상세: 결제 내역, 메모, 상담 기록
-- Supabase SQL Editor에서 실행하세요.

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

-- 기존 회원 결제 내역 백필
insert into public.payment_history (member_id, amount, sessions, paid_at, note)
select m.id, m.payment_amount, m.total_sessions, m.registered_at, '초기 등록'
from public.members m
where not exists (
  select 1 from public.payment_history ph where ph.member_id = m.id
);

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
