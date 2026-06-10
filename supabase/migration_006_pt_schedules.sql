-- PT 스케줄 (캘린더)
-- Supabase SQL Editor에서 실행

create table if not exists public.pt_schedules (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  trainer_id uuid references public.trainers (id) on delete set null,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pt_schedules_scheduled_at_idx on public.pt_schedules (scheduled_at);
create index if not exists pt_schedules_member_id_idx on public.pt_schedules (member_id);
create index if not exists pt_schedules_trainer_id_idx on public.pt_schedules (trainer_id);

alter table public.pt_schedules enable row level security;

drop policy if exists "pt_schedules_all" on public.pt_schedules;
create policy "pt_schedules_all" on public.pt_schedules
  for all using (true) with check (true);
