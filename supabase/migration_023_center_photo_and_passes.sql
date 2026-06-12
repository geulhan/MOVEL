-- 센터 사진 인증(마일리지) + 센터 이용권(기간권, PT 별개)
-- Supabase SQL Editor에서 실행하세요.

-- 센터 사진 인증 제출
create table if not exists public.center_photo_submissions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  submission_date date not null default current_date,
  image_url text not null,
  image_path text,
  status text not null default 'approved'
    check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  mile_awarded integer not null default 0 check (mile_awarded >= 0),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists center_photo_submissions_member_date_approved_uidx
  on public.center_photo_submissions (member_id, submission_date)
  where status = 'approved';

create index if not exists center_photo_submissions_member_created_idx
  on public.center_photo_submissions (member_id, created_at desc);

create index if not exists center_photo_submissions_status_idx
  on public.center_photo_submissions (status);

alter table public.center_photo_submissions enable row level security;

drop policy if exists center_photo_submissions_all on public.center_photo_submissions;
create policy center_photo_submissions_all on public.center_photo_submissions
  for all using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'center-photos',
  'center-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

drop policy if exists center_photos_storage_all on storage.objects;
create policy center_photos_storage_all on storage.objects
  for all using (bucket_id = 'center-photos')
  with check (bucket_id = 'center-photos');

-- 센터 이용권 상품 (추후 판매·배포용 카탈로그)
create table if not exists public.center_pass_products (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  duration_days integer not null check (duration_days >= 1),
  list_amount numeric(12, 0) not null default 0 check (list_amount >= 0),
  description text,
  is_active boolean not null default false,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 회원별 센터 이용권 (PT 횟수와 무관한 기간권)
create table if not exists public.center_passes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  product_id uuid references public.center_pass_products (id) on delete set null,
  label text not null,
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

create index if not exists center_pass_products_active_idx
  on public.center_pass_products (is_active, sort_order);

create index if not exists center_passes_member_id_idx
  on public.center_passes (member_id);

create index if not exists center_passes_status_ends_idx
  on public.center_passes (status, ends_at);

alter table public.center_pass_products enable row level security;
alter table public.center_passes enable row level security;

drop policy if exists center_pass_products_all on public.center_pass_products;
create policy center_pass_products_all on public.center_pass_products
  for all using (true) with check (true);

drop policy if exists center_passes_all on public.center_passes;
create policy center_passes_all on public.center_passes
  for all using (true) with check (true);

drop trigger if exists center_pass_products_updated_at on public.center_pass_products;
create trigger center_pass_products_updated_at
  before update on public.center_pass_products
  for each row execute function public.set_updated_at();

drop trigger if exists center_passes_updated_at on public.center_passes;
create trigger center_passes_updated_at
  before update on public.center_passes
  for each row execute function public.set_updated_at();

insert into public.center_pass_products (label, duration_days, list_amount, description, is_active, sort_order)
select *
from (
  values
    ('센터 1개월 이용권', 30, 0::numeric, 'PT 수업과 별개의 센터 시설 이용 기간권 (판매 준비)', false, 1),
    ('센터 3개월 이용권', 90, 0::numeric, 'PT 수업과 별개의 센터 시설 이용 기간권 (판매 준비)', false, 2),
    ('센터 6개월 이용권', 180, 0::numeric, 'PT 수업과 별개의 센터 시설 이용 기간권 (판매 준비)', false, 3)
) as seed(label, duration_days, list_amount, description, is_active, sort_order)
where not exists (select 1 from public.center_pass_products limit 1);

update public.reward_settings
set setting_value = setting_value || '{"center_photo": {"score": 20, "mile": 500}}'::jsonb,
    updated_at = now()
where branch_id is null
  and setting_key = 'earn_rules'
  and not (setting_value ? 'center_photo');
