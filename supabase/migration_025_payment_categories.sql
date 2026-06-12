-- 결제 카테고리: PT / 센터 이용권 / 라커·수건
-- Supabase SQL Editor에서 실행하세요.

alter table public.payment_requests
  add column if not exists category text not null default 'pt'
    check (category in ('pt', 'center_pass', 'locker_towel')),
  add column if not exists duration_days integer
    check (duration_days is null or duration_days >= 1);

alter table public.payment_requests
  alter column sessions drop not null;

alter table public.payment_requests
  drop constraint if exists payment_requests_sessions_check;

alter table public.payment_requests
  add constraint payment_requests_sessions_check
  check (sessions is null or sessions >= 0);

update public.payment_requests
set category = 'pt'
where category is null;

alter table public.payment_history
  add column if not exists category text not null default 'pt'
    check (category in ('pt', 'center_pass', 'locker_towel'));

drop index if exists payment_requests_pending_member_idx;

create unique index if not exists payment_requests_pending_member_category_uidx
  on public.payment_requests (member_id, category)
  where status = 'pending';

create index if not exists payment_requests_category_idx
  on public.payment_requests (category, created_at desc);

-- 라커 · 수건 상품 카탈로그
create table if not exists public.facility_products (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sub_type text not null default 'bundle'
    check (sub_type in ('locker', 'towel', 'bundle')),
  duration_days integer not null default 30 check (duration_days >= 1),
  list_amount numeric(12, 0) not null default 0 check (list_amount >= 0),
  description text,
  is_active boolean not null default false,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 회원 라커 · 수건 이용
create table if not exists public.member_facility_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  product_id uuid references public.facility_products (id) on delete set null,
  label text not null,
  sub_type text not null default 'bundle'
    check (sub_type in ('locker', 'towel', 'bundle')),
  starts_at date not null,
  ends_at date not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'active', 'expired', 'cancelled')),
  amount numeric(12, 0) check (amount is null or amount >= 0),
  note text,
  payment_history_id uuid references public.payment_history (id) on delete set null,
  created_by text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);

create index if not exists facility_products_active_idx
  on public.facility_products (is_active, sort_order);

create index if not exists member_facility_subscriptions_member_idx
  on public.member_facility_subscriptions (member_id);

create index if not exists member_facility_subscriptions_status_idx
  on public.member_facility_subscriptions (status, ends_at);

alter table public.facility_products enable row level security;
alter table public.member_facility_subscriptions enable row level security;

drop policy if exists facility_products_all on public.facility_products;
create policy facility_products_all on public.facility_products
  for all using (true) with check (true);

drop policy if exists member_facility_subscriptions_all on public.member_facility_subscriptions;
create policy member_facility_subscriptions_all on public.member_facility_subscriptions
  for all using (true) with check (true);

drop trigger if exists facility_products_updated_at on public.facility_products;
create trigger facility_products_updated_at
  before update on public.facility_products
  for each row execute function public.set_updated_at();

drop trigger if exists member_facility_subscriptions_updated_at on public.member_facility_subscriptions;
create trigger member_facility_subscriptions_updated_at
  before update on public.member_facility_subscriptions
  for each row execute function public.set_updated_at();

insert into public.facility_products (label, sub_type, duration_days, list_amount, description, is_active, sort_order)
select *
from (
  values
    ('개인 라커 1개월', 'locker', 30, 0::numeric, '라커 이용 (판매 준비)', false, 1),
    ('수건 서비스 1개월', 'towel', 30, 0::numeric, '수건 대여 (판매 준비)', false, 2),
    ('라커 + 수건 1개월', 'bundle', 30, 0::numeric, '라커·수건 패키지 (판매 준비)', false, 3)
) as seed(label, sub_type, duration_days, list_amount, description, is_active, sort_order)
where not exists (select 1 from public.facility_products limit 1);
