-- MotionHub SaaS: Super Admin (platform_admins)
-- migration_040 이후 실행

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists platform_admins_updated_at on public.platform_admins;
create trigger platform_admins_updated_at
  before update on public.platform_admins
  for each row execute function public.set_updated_at();

alter table public.platform_admins enable row level security;
-- policy 없음 → RPC only

insert into public.platform_admins (username, password_hash, display_name)
select
  'motionhub',
  extensions.crypt('motionhub-admin', extensions.gen_salt('bf')),
  'MotionHub Super Admin'
where not exists (
  select 1 from public.platform_admins where username = 'motionhub'
);

comment on table public.platform_admins is
  'MotionHub 플랫폼 Super Admin. 배포 후 비밀번호를 반드시 변경하세요.';
