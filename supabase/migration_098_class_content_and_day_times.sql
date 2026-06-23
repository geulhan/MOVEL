-- 그룹수업: 고정 일정 요일별 시간 + 클래스 수업 내용 필드
alter table public.class_fixed_schedules
  add column if not exists day_times jsonb;

update public.class_fixed_schedules
set day_times = (
  select jsonb_object_agg(d::text, time_of_day)
  from unnest(coalesce(days_of_week, array[day_of_week]::smallint[])) as d
)
where day_times is null;

alter table public.classes
  add column if not exists content_fields jsonb not null default '{}'::jsonb;
