-- 고정 수업 복수 요일 지원
alter table public.pt_fixed_schedules
  add column if not exists days_of_week smallint[];

update public.pt_fixed_schedules
set days_of_week = array[day_of_week]::smallint[]
where days_of_week is null and day_of_week is not null;
