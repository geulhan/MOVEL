-- 회원 포털: 운동일지 + 출석 인증
-- Supabase SQL Editor에서 실행

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
create index if not exists attendance_logs_checked_in_idx on public.attendance_logs (checked_in_at);

alter table public.exercise_journals enable row level security;
alter table public.attendance_logs enable row level security;

drop policy if exists "exercise_journals_all" on public.exercise_journals;
create policy "exercise_journals_all" on public.exercise_journals
  for all using (true) with check (true);

drop policy if exists "attendance_logs_all" on public.attendance_logs;
create policy "attendance_logs_all" on public.attendance_logs
  for all using (true) with check (true);
