-- MotionHub SaaS: 멀티센터 UNIQUE 제약 (phone, trainer name)
-- migration_044 이후 실행

-- members.phone: 센터별 UNIQUE
alter table public.members drop constraint if exists members_phone_key;

drop index if exists public.members_phone_idx;
drop index if exists public.members_center_phone_uidx;

create unique index members_center_phone_uidx
  on public.members (
    center_id,
    (regexp_replace(phone, '\D', '', 'g'))
  );

create index if not exists members_phone_idx
  on public.members (phone);

-- trainers.name: 센터별 UNIQUE
alter table public.trainers drop constraint if exists trainers_name_key;

drop index if exists public.trainers_center_name_uidx;

create unique index trainers_center_name_uidx
  on public.trainers (center_id, name);

-- centers.slug: 소문자·하이픈만 허용 (앱에서도 검증)
alter table public.centers drop constraint if exists centers_slug_format_check;

alter table public.centers
  add constraint centers_slug_format_check check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  );
