-- 고정 PT 수업 (요일·시간 반복) + 개별 일정 연결
-- Supabase SQL Editor에서 실행하세요.

create table if not exists public.pt_fixed_schedules (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete restrict,
  member_id uuid not null references public.members (id) on delete cascade,
  trainer_id uuid references public.trainers (id) on delete set null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  time_of_day text not null,
  duration_minutes integer not null default 50 check (duration_minutes > 0),
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pt_fixed_schedules_center_id_idx
  on public.pt_fixed_schedules (center_id);

create index if not exists pt_fixed_schedules_member_id_idx
  on public.pt_fixed_schedules (member_id);

create index if not exists pt_fixed_schedules_trainer_id_idx
  on public.pt_fixed_schedules (trainer_id);

alter table public.pt_fixed_schedules enable row level security;

drop policy if exists pt_fixed_schedules_all on public.pt_fixed_schedules;
create policy pt_fixed_schedules_all on public.pt_fixed_schedules
  for all using (true) with check (true);

grant select, insert, update, delete on public.pt_fixed_schedules to anon, authenticated;

alter table public.pt_schedules
  add column if not exists fixed_schedule_id uuid
    references public.pt_fixed_schedules (id) on delete set null;

alter table public.pt_schedules
  add column if not exists is_detached boolean not null default false;

create index if not exists pt_schedules_fixed_schedule_id_idx
  on public.pt_schedules (fixed_schedule_id);
