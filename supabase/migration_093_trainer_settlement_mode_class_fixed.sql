-- 강사 수업료: 비율(%) 또는 고정금액(원) + 그룹수업 고정 일정

alter table public.trainers
  add column if not exists settlement_mode text not null default 'percent';

alter table public.trainers
  drop constraint if exists trainers_settlement_mode_check;

alter table public.trainers
  add constraint trainers_settlement_mode_check
  check (settlement_mode in ('percent', 'fixed'));

alter table public.trainers
  add column if not exists settlement_fixed_amount integer;

alter table public.trainers
  drop constraint if exists trainers_settlement_fixed_amount_check;

alter table public.trainers
  add constraint trainers_settlement_fixed_amount_check
  check (
    settlement_fixed_amount is null
    or settlement_fixed_amount >= 0
  );

comment on column public.trainers.settlement_mode is
  '수업료 정산 방식: percent(비율) | fixed(고정금액/회)';

comment on column public.trainers.settlement_fixed_amount is
  '고정 수업료(원). settlement_mode=fixed일 때 1회(PT 출석 또는 그룹수업 진행)당 적용';

-- ---------------------------------------------------------------------------
-- 그룹수업 고정 일정 (요일·시간 반복)
-- ---------------------------------------------------------------------------
create table if not exists public.class_fixed_schedules (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  days_of_week smallint[] null,
  time_of_day text not null,
  capacity integer check (capacity is null or capacity >= 1),
  weeks_ahead integer not null default 8
    check (weeks_ahead >= 1 and weeks_ahead <= 52),
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists class_fixed_schedules_center_id_idx
  on public.class_fixed_schedules (center_id);

create index if not exists class_fixed_schedules_class_id_idx
  on public.class_fixed_schedules (class_id);

alter table public.class_fixed_schedules enable row level security;

drop policy if exists class_fixed_schedules_all on public.class_fixed_schedules;
create policy class_fixed_schedules_all on public.class_fixed_schedules
  for all using (true) with check (true);

grant select, insert, update, delete on public.class_fixed_schedules to anon, authenticated;

alter table public.class_schedules
  add column if not exists fixed_schedule_id uuid
    references public.class_fixed_schedules (id) on delete set null;

alter table public.class_schedules
  add column if not exists is_detached boolean not null default false;

create index if not exists class_schedules_fixed_schedule_id_idx
  on public.class_schedules (fixed_schedule_id);
