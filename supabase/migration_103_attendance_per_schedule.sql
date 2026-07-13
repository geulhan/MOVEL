-- PT 예약별 출석·차감: 동일 회원 하루 2회 예약 시 개별 차감 지원

alter table public.attendance_logs
  add column if not exists schedule_id uuid references public.pt_schedules (id) on delete set null;

alter table public.session_logs
  add column if not exists schedule_id uuid references public.pt_schedules (id) on delete set null;

create unique index if not exists attendance_logs_schedule_id_unique
  on public.attendance_logs (schedule_id)
  where schedule_id is not null;

create index if not exists attendance_logs_schedule_id_idx
  on public.attendance_logs (schedule_id);

create index if not exists session_logs_schedule_id_idx
  on public.session_logs (schedule_id);
