-- MotionHub 베타 신청 (랜딩 페이지)
-- Supabase SQL Editor에서 실행하세요.

create table if not exists public.beta_applications (
  id uuid primary key default gen_random_uuid(),
  center_name text not null,
  contact_name text not null,
  phone text not null,
  email text,
  center_type text not null check (
    center_type in ('pt', 'pilates', 'freelance', 'other')
  ),
  message text,
  created_at timestamptz not null default now()
);

create index if not exists beta_applications_created_at_idx
  on public.beta_applications (created_at desc);

alter table public.beta_applications enable row level security;

drop policy if exists beta_applications_insert on public.beta_applications;
create policy beta_applications_insert on public.beta_applications
  for insert to anon, authenticated
  with check (true);

drop policy if exists beta_applications_select_admin on public.beta_applications;
create policy beta_applications_select_admin on public.beta_applications
  for select to authenticated
  using (true);

grant insert on public.beta_applications to anon, authenticated;
grant select on public.beta_applications to authenticated;

create or replace function public.get_beta_application_count()
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int from public.beta_applications;
$$;

revoke all on function public.get_beta_application_count() from public;
grant execute on function public.get_beta_application_count() to anon, authenticated;
