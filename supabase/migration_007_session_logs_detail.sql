-- PT 차감 이력 상세 (차감 수량·차감 후 잔여)
-- Supabase SQL Editor에서 실행

alter table public.session_logs
  add column if not exists quantity integer not null default 1 check (quantity > 0);

alter table public.session_logs
  add column if not exists remaining_after integer check (remaining_after >= 0);
