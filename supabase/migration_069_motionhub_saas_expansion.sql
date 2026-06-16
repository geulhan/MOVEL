-- MotionHub SaaS 확장: 센터 유형, 운영 기능 토글, 그룹수업, 시설 운영
-- migration_068 이후 실행

-- ---------------------------------------------------------------------------
-- 1. 센터 운영 유형
-- ---------------------------------------------------------------------------
alter table public.centers
  add column if not exists operational_type text not null default 'pt'
    check (operational_type in ('pt', 'pilates', 'yoga', 'gym', 'hybrid'));

update public.centers
set operational_type = 'hybrid'
where slug = 'movel';

-- ---------------------------------------------------------------------------
-- 2. 운영 기능 기본값 적용 헬퍼
-- ---------------------------------------------------------------------------
create or replace function public.apply_operational_features(
  p_center_id uuid,
  p_operational_type text default 'pt'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text := coalesce(nullif(trim(p_operational_type), ''), 'pt');
  v_flags jsonb;
begin
  v_flags := case v_type
    when 'pilates' then jsonb_build_object(
      'membership', true, 'pt', false, 'facility', false, 'locker', false, 'towel', false,
      'class', true, 'pilates', true, 'yoga', false, 'gx', false,
      'attendance', true, 'exercise_log', false
    )
    when 'yoga' then jsonb_build_object(
      'membership', true, 'pt', false, 'facility', false, 'locker', false, 'towel', false,
      'class', true, 'pilates', false, 'yoga', true, 'gx', false,
      'attendance', true, 'exercise_log', false
    )
    when 'gym' then jsonb_build_object(
      'membership', true, 'pt', false, 'facility', true, 'locker', true, 'towel', true,
      'class', false, 'pilates', false, 'yoga', false, 'gx', false,
      'attendance', true, 'exercise_log', false
    )
    when 'hybrid' then jsonb_build_object(
      'membership', true, 'pt', true, 'facility', true, 'locker', true, 'towel', true,
      'class', true, 'pilates', true, 'yoga', true, 'gx', true,
      'attendance', true, 'exercise_log', true
    )
    else jsonb_build_object(
      'membership', true, 'pt', true, 'facility', false, 'locker', false, 'towel', false,
      'class', false, 'pilates', false, 'yoga', false, 'gx', false,
      'attendance', true, 'exercise_log', true
    )
  end;

  insert into public.center_features (center_id, feature_key, enabled)
  select p_center_id, key, coalesce((v_flags ->> key)::boolean, false)
  from jsonb_object_keys(v_flags) as key
  on conflict (center_id, feature_key)
  do update set enabled = excluded.enabled, updated_at = now();
end;
$$;

-- 기존 센터에 운영 기능 키 시드 (없으면 hybrid/PT 기본)
insert into public.center_features (center_id, feature_key, enabled)
select c.id, f.key, f.enabled
from public.centers c
cross join lateral (
  select key, enabled
  from (
    values
      ('membership', true),
      ('pt', c.operational_type in ('pt', 'hybrid')),
      ('facility', c.operational_type in ('gym', 'hybrid')),
      ('locker', c.operational_type in ('gym', 'hybrid')),
      ('towel', c.operational_type in ('gym', 'hybrid')),
      ('class', c.operational_type in ('pilates', 'yoga', 'hybrid')),
      ('pilates', c.operational_type in ('pilates', 'hybrid')),
      ('yoga', c.operational_type in ('yoga', 'hybrid')),
      ('gx', c.operational_type = 'hybrid'),
      ('attendance', true),
      ('exercise_log', c.operational_type in ('pt', 'hybrid'))
  ) as t(key, enabled)
) f
where c.deleted_at is null
on conflict (center_id, feature_key) do nothing;

-- ---------------------------------------------------------------------------
-- 3. 그룹수업 테이블
-- ---------------------------------------------------------------------------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  name text not null,
  description text,
  trainer_id uuid references public.trainers (id) on delete set null,
  capacity integer not null default 8 check (capacity >= 1),
  duration_minutes integer not null default 60 check (duration_minutes >= 15),
  color text not null default '#2dd4bf',
  class_type text not null default 'pilates'
    check (class_type in ('pilates', 'yoga', 'gx', 'group_pt')),
  pass_type text not null default 'pilates'
    check (pass_type in ('pilates', 'yoga', 'gx', 'group_pt', 'none')),
  deduct_sessions boolean not null default true,
  waitlist_enabled boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists classes_center_status_idx
  on public.classes (center_id, status);

create table if not exists public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer check (capacity is null or capacity >= 1),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'cancelled', 'completed')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists class_schedules_center_starts_idx
  on public.class_schedules (center_id, starts_at);

create table if not exists public.class_reservations (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  schedule_id uuid not null references public.class_schedules (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  status text not null default 'reserved'
    check (status in ('reserved', 'waitlist', 'cancelled', 'attended', 'noshow')),
  reserved_at timestamptz not null default now(),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, member_id)
);

create index if not exists class_reservations_schedule_status_idx
  on public.class_reservations (schedule_id, status);

create table if not exists public.class_attendance (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  reservation_id uuid not null references public.class_reservations (id) on delete cascade,
  schedule_id uuid not null references public.class_schedules (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  status text not null default 'attended'
    check (status in ('attended', 'noshow', 'cancelled')),
  sessions_deducted integer not null default 0 check (sessions_deducted >= 0),
  checked_at timestamptz not null default now(),
  checked_by text,
  created_at timestamptz not null default now()
);

create unique index if not exists class_attendance_reservation_uidx
  on public.class_attendance (reservation_id);

-- 회원 수강권 (필라테스·요가·GX·소그룹 PT 회차권)
create table if not exists public.member_session_passes (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  pass_type text not null
    check (pass_type in ('pilates', 'yoga', 'gx', 'group_pt')),
  label text not null,
  total_sessions integer check (total_sessions is null or total_sessions >= 0),
  remaining_sessions integer check (remaining_sessions is null or remaining_sessions >= 0),
  is_unlimited boolean not null default false,
  starts_at date,
  ends_at date,
  status text not null default 'active'
    check (status in ('active', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_session_passes_member_idx
  on public.member_session_passes (member_id, pass_type, status);

-- ---------------------------------------------------------------------------
-- 4. 시설 운영 (락커·수건)
-- ---------------------------------------------------------------------------
create table if not exists public.locker_assignments (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  locker_number text not null,
  starts_at date not null,
  ends_at date not null,
  status text not null default 'active'
    check (status in ('active', 'expired', 'cancelled')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);

create index if not exists locker_assignments_center_status_idx
  on public.locker_assignments (center_id, status, ends_at);

create table if not exists public.towel_rentals (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  rented_at timestamptz not null default now(),
  returned_at timestamptz,
  status text not null default 'rented'
    check (status in ('rented', 'returned', 'lost')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists towel_rentals_center_status_idx
  on public.towel_rentals (center_id, status, rented_at desc);

create table if not exists public.facility_checkins (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists facility_checkins_center_checked_idx
  on public.facility_checkins (center_id, checked_in_at desc);

-- RLS
alter table public.classes enable row level security;
alter table public.class_schedules enable row level security;
alter table public.class_reservations enable row level security;
alter table public.class_attendance enable row level security;
alter table public.member_session_passes enable row level security;
alter table public.locker_assignments enable row level security;
alter table public.towel_rentals enable row level security;
alter table public.facility_checkins enable row level security;

drop policy if exists classes_all on public.classes;
create policy classes_all on public.classes for all using (true) with check (true);
drop policy if exists class_schedules_all on public.class_schedules;
create policy class_schedules_all on public.class_schedules for all using (true) with check (true);
drop policy if exists class_reservations_all on public.class_reservations;
create policy class_reservations_all on public.class_reservations for all using (true) with check (true);
drop policy if exists class_attendance_all on public.class_attendance;
create policy class_attendance_all on public.class_attendance for all using (true) with check (true);
drop policy if exists member_session_passes_all on public.member_session_passes;
create policy member_session_passes_all on public.member_session_passes for all using (true) with check (true);
drop policy if exists locker_assignments_all on public.locker_assignments;
create policy locker_assignments_all on public.locker_assignments for all using (true) with check (true);
drop policy if exists towel_rentals_all on public.towel_rentals;
create policy towel_rentals_all on public.towel_rentals for all using (true) with check (true);
drop policy if exists facility_checkins_all on public.facility_checkins;
create policy facility_checkins_all on public.facility_checkins for all using (true) with check (true);

drop trigger if exists classes_updated_at on public.classes;
create trigger classes_updated_at before update on public.classes
  for each row execute function public.set_updated_at();
drop trigger if exists class_schedules_updated_at on public.class_schedules;
create trigger class_schedules_updated_at before update on public.class_schedules
  for each row execute function public.set_updated_at();
drop trigger if exists class_reservations_updated_at on public.class_reservations;
create trigger class_reservations_updated_at before update on public.class_reservations
  for each row execute function public.set_updated_at();
drop trigger if exists member_session_passes_updated_at on public.member_session_passes;
create trigger member_session_passes_updated_at before update on public.member_session_passes
  for each row execute function public.set_updated_at();
drop trigger if exists locker_assignments_updated_at on public.locker_assignments;
create trigger locker_assignments_updated_at before update on public.locker_assignments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. 센터 관리자 기능 토글 RPC
-- ---------------------------------------------------------------------------
create or replace function public.update_center_operational_features(
  p_session_token text,
  p_features jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_key text;
  v_enabled boolean;
  v_allowed text[] := array[
    'membership', 'pt', 'facility', 'locker', 'towel', 'class',
    'pilates', 'yoga', 'gx', 'attendance', 'exercise_log',
    'mileage', 'contracts', 'notifications'
  ];
begin
  select * into v_session
  from public.verify_auth_session(p_session_token, 'center_user')
  limit 1;

  if v_session.actor_id is null or v_session.center_id is null then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if v_session.role not in ('admin', 'center_admin') then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_features is null or jsonb_typeof(p_features) <> 'object' then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  for v_key, v_enabled in
    select key, value::text::boolean
    from jsonb_each(p_features)
  loop
    if v_key = any (v_allowed) then
      insert into public.center_features (center_id, feature_key, enabled)
      values (v_session.center_id, v_key, coalesce(v_enabled, false))
      on conflict (center_id, feature_key)
      do update set enabled = excluded.enabled, updated_at = now();
    end if;
  end loop;

  return json_build_object(
    'ok', true,
    'center_id', v_session.center_id,
    'features', (
      select coalesce(json_object_agg(feature_key, enabled), '{}'::json)
      from public.center_features
      where center_id = v_session.center_id
    )
  );
end;
$$;

revoke all on function public.update_center_operational_features(text, jsonb) from public;
grant execute on function public.update_center_operational_features(text, jsonb) to anon, authenticated;

-- 플랫폼 기능 토글 확장
create or replace function public.update_center_features(
  p_session_token text,
  p_center_id uuid,
  p_features jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_enabled boolean;
  v_allowed text[] := array[
    'membership', 'pt', 'facility', 'locker', 'towel', 'class',
    'pilates', 'yoga', 'gx', 'attendance', 'exercise_log',
    'mileage', 'contracts', 'notifications'
  ];
begin
  if not exists (
    select 1
    from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  ) then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if p_center_id is null or p_features is null or jsonb_typeof(p_features) <> 'object' then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  if not exists (
    select 1 from public.centers where id = p_center_id and deleted_at is null
  ) then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  for v_key, v_enabled in
    select key, value::text::boolean
    from jsonb_each(p_features)
  loop
    if v_key = any (v_allowed) then
      insert into public.center_features (center_id, feature_key, enabled)
      values (p_center_id, v_key, coalesce(v_enabled, false))
      on conflict (center_id, feature_key)
      do update set enabled = excluded.enabled, updated_at = now();
    end if;
  end loop;

  return json_build_object(
    'ok', true,
    'center_id', p_center_id,
    'features', (
      select coalesce(json_object_agg(feature_key, enabled), '{}'::json)
      from public.center_features
      where center_id = p_center_id
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. create_center: 센터 유형 + 운영 기능
-- ---------------------------------------------------------------------------
create or replace function public.create_center(
  p_session_token text,
  p_name text,
  p_slug text,
  p_admin_username text,
  p_admin_password text,
  p_plan_code text default 'starter',
  p_contact_email text default null,
  p_contact_phone text default null,
  p_service_starts_at date default null,
  p_service_ends_at date default null,
  p_operational_type text default 'pt'
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_session record;
  v_center_id uuid;
  v_plan_id uuid;
  v_slug text;
  v_username text;
  v_admin_id uuid;
  v_today date := public.center_local_today();
  v_starts date;
  v_ends date;
  v_phone_digits text;
  v_op_type text;
begin
  select * into v_session
  from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  limit 1;

  if v_session.actor_id is null then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if trim(coalesce(p_name, '')) = '' then
    return json_build_object('ok', false, 'error', 'invalid_name');
  end if;

  v_slug := lower(trim(coalesce(p_slug, '')));
  if v_slug = '' or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    return json_build_object(
      'ok', false,
      'error', 'invalid_slug',
      'message', '센터 코드는 영문 소문자·숫자·하이픈만 사용할 수 있습니다.'
    );
  end if;

  if exists (select 1 from public.centers where slug = v_slug and deleted_at is null) then
    return json_build_object('ok', false, 'error', 'slug_taken');
  end if;

  v_username := lower(trim(coalesce(p_admin_username, '')));
  if v_username = '' then
    return json_build_object('ok', false, 'error', 'invalid_admin_username');
  end if;

  if p_admin_password is null or length(p_admin_password) < 4 then
    return json_build_object('ok', false, 'error', 'invalid_admin_password');
  end if;

  v_phone_digits := regexp_replace(coalesce(p_contact_phone, ''), '\D', '', 'g');
  if v_phone_digits <> ''
     and (length(v_phone_digits) <> 11 or left(v_phone_digits, 3) <> '010') then
    return json_build_object(
      'ok', false,
      'error', 'invalid_phone',
      'message', '010으로 시작하는 11자리 휴대전화번호를 입력해 주세요.'
    );
  end if;

  v_starts := coalesce(p_service_starts_at, v_today);
  v_ends := coalesce(p_service_ends_at, v_starts + 14);

  if v_ends < v_starts then
    return json_build_object(
      'ok', false,
      'error', 'invalid_service_period',
      'message', '이용 종료일은 시작일보다 빠를 수 없습니다.'
    );
  end if;

  v_op_type := coalesce(nullif(trim(p_operational_type), ''), 'pt');
  if v_op_type not in ('pt', 'pilates', 'yoga', 'gym', 'hybrid') then
    v_op_type := 'pt';
  end if;

  select id into v_plan_id
  from public.subscription_plans
  where code = coalesce(nullif(trim(p_plan_code), ''), 'starter')
    and is_active = true;

  if v_plan_id is null then
    select id into v_plan_id
    from public.subscription_plans
    where code = 'starter'
    limit 1;
  end if;

  insert into public.centers (
    name, slug, status, plan_id, contact_email, contact_phone,
    service_starts_at, service_ends_at, operational_type, settings
  )
  values (
    trim(p_name), v_slug, 'active', v_plan_id,
    nullif(trim(coalesce(p_contact_email, '')), ''),
    nullif(v_phone_digits, ''),
    v_starts, v_ends, v_op_type,
    jsonb_build_object('beta_trial', true)
  )
  returning id into v_center_id;

  insert into public.center_features (center_id, feature_key, enabled)
  select v_center_id, f.key,
    case
      when f.key = 'notifications' then false
      else coalesce((sp.features ->> f.key)::boolean, false)
    end
  from public.subscription_plans sp
  cross join (
    values ('mileage'), ('contracts'), ('notifications')
  ) as f(key)
  where sp.id = v_plan_id
  on conflict (center_id, feature_key) do nothing;

  perform public.apply_operational_features(v_center_id, v_op_type);

  insert into public.center_users (
    center_id, role, username, password_hash, display_name, phone
  )
  values (
    v_center_id, 'center_admin', v_username,
    extensions.crypt(p_admin_password, extensions.gen_salt('bf')),
    trim(p_name) || ' 관리자',
    nullif(v_phone_digits, '')
  )
  returning id into v_admin_id;

  perform public.provision_center_message_beta_credits(v_center_id);

  return json_build_object(
    'ok', true,
    'center_id', v_center_id,
    'center_slug', v_slug,
    'center_name', trim(p_name),
    'admin_user_id', v_admin_id,
    'admin_username', v_username,
    'operational_type', v_op_type,
    'service_starts_at', v_starts,
    'service_ends_at', v_ends
  );
exception
  when unique_violation then
    return json_build_object('ok', false, 'error', 'slug_taken');
end;
$$;

revoke all on function public.create_center(text, text, text, text, text, text, text, text, date, date, text) from public;
grant execute on function public.create_center(text, text, text, text, text, text, text, text, date, date, text) to anon, authenticated;
