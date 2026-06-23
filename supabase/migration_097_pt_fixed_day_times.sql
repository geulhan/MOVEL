-- 고정 PT 수업: 요일별 서로 다른 시간 지원
alter table public.pt_fixed_schedules
  add column if not exists day_times jsonb;

update public.pt_fixed_schedules
set day_times = (
  select jsonb_object_agg(d::text, time_of_day)
  from unnest(coalesce(days_of_week, array[day_of_week]::smallint[])) as d
)
where day_times is null;
