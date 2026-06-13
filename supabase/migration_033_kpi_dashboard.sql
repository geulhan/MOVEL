-- 운영 KPI: 회원 로그인 이력
-- Supabase SQL Editor에서 실행하세요.

create table if not exists public.member_login_logs (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete restrict,
  member_id uuid not null references public.members (id) on delete cascade,
  login_at timestamptz not null default now(),
  device_type text not null default 'unknown',
  created_at timestamptz not null default now()
);

create index if not exists member_login_logs_center_id_idx
  on public.member_login_logs (center_id);

create index if not exists member_login_logs_member_id_idx
  on public.member_login_logs (member_id);

create index if not exists member_login_logs_login_at_idx
  on public.member_login_logs (login_at desc);

create index if not exists member_login_logs_center_login_at_idx
  on public.member_login_logs (center_id, login_at desc);

alter table public.member_login_logs enable row level security;

drop policy if exists member_login_logs_all on public.member_login_logs;
create policy member_login_logs_all on public.member_login_logs
  for all using (true) with check (true);

grant select, insert on public.member_login_logs to anon, authenticated;
