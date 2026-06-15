-- MotionHub SaaS: 요금제 + 센터 기능 플래그 + centers 확장
-- migration_032 이후 실행

-- ---------------------------------------------------------------------------
-- 1. subscription_plans
-- ---------------------------------------------------------------------------
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  max_members integer,
  max_trainers integer,
  features jsonb not null default '{}',
  price_monthly numeric(12, 0) not null default 0 check (price_monthly >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.subscription_plans (code, name, max_members, max_trainers, features, price_monthly)
values
  (
    'starter',
    'Starter',
    100,
    5,
    '{"mileage": true, "contracts": false, "notifications": true}'::jsonb,
    0
  ),
  (
    'pro',
    'Pro',
    500,
    20,
    '{"mileage": true, "contracts": true, "notifications": true}'::jsonb,
    99000
  ),
  (
    'legacy_movel',
    'MOVEL Legacy',
    null,
    null,
    '{"mileage": true, "contracts": true, "notifications": true}'::jsonb,
    0
  )
on conflict (code) do update
set
  name = excluded.name,
  features = excluded.features;

-- ---------------------------------------------------------------------------
-- 2. centers 확장
-- ---------------------------------------------------------------------------
alter table public.centers
  add column if not exists plan_id uuid references public.subscription_plans (id),
  add column if not exists owner_name text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists address text,
  add column if not exists timezone text not null default 'Asia/Seoul',
  add column if not exists settings jsonb not null default '{}',
  add column if not exists suspended_at timestamptz,
  add column if not exists deleted_at timestamptz;

update public.centers c
set plan_id = p.id
from public.subscription_plans p
where c.slug = 'movel'
  and p.code = 'legacy_movel'
  and c.plan_id is null;

-- ---------------------------------------------------------------------------
-- 3. center_features
-- ---------------------------------------------------------------------------
create table if not exists public.center_features (
  center_id uuid not null references public.centers (id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (center_id, feature_key)
);

drop trigger if exists center_features_updated_at on public.center_features;
create trigger center_features_updated_at
  before update on public.center_features
  for each row execute function public.set_updated_at();

insert into public.center_features (center_id, feature_key, enabled)
select c.id, f.key, true
from public.centers c
cross join (
  values
    ('mileage'),
    ('contracts'),
    ('notifications')
) as f(key)
where c.slug = 'movel'
on conflict (center_id, feature_key) do nothing;

alter table public.subscription_plans enable row level security;
alter table public.center_features enable row level security;

drop policy if exists subscription_plans_all on public.subscription_plans;
create policy subscription_plans_all on public.subscription_plans
  for all using (true) with check (true);

drop policy if exists center_features_all on public.center_features;
create policy center_features_all on public.center_features
  for all using (true) with check (true);
