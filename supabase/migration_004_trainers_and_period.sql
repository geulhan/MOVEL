-- 트레이너 선택 + 세션당 4일 기간 + 기간 연장
-- Supabase SQL Editor에서 실행하세요.

create table if not exists public.trainers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.members
  add column if not exists trainer_id uuid references public.trainers (id) on delete set null;

create table if not exists public.period_extensions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  days_added integer not null check (days_added > 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists members_trainer_id_idx on public.members (trainer_id);
create index if not exists period_extensions_member_id_idx on public.period_extensions (member_id);

-- 기존 trainer_name → trainers 테이블 이전
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

-- 기존 만료일 없는 회원: 등록일 + 잔여세션×4일
update public.members
set expires_at = (registered_at + (remaining_sessions * 4))
where expires_at is null
  and remaining_sessions > 0;

alter table public.trainers enable row level security;
alter table public.period_extensions enable row level security;

drop policy if exists "trainers_all" on public.trainers;
create policy "trainers_all" on public.trainers
  for all using (true) with check (true);

drop policy if exists "period_extensions_all" on public.period_extensions;
create policy "period_extensions_all" on public.period_extensions
  for all using (true) with check (true);
