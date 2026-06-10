-- 기존 DB에 새 컬럼 추가 (기존 데이터 유지)
-- Supabase SQL Editor에서 이 파일만 실행하세요.
-- 이미 schema.sql 최신 버전으로 처음부터 만든 경우에는 실행하지 않아도 됩니다.

alter table public.members
  add column if not exists registered_at date,
  add column if not exists expires_at date,
  add column if not exists trainer_name text,
  add column if not exists status text not null default 'active';

-- 기존 회원: 등록일을 created_at 날짜로 채움
update public.members
  set registered_at = (created_at at time zone 'Asia/Seoul')::date
  where registered_at is null;

alter table public.members
  alter column registered_at set default current_date;

alter table public.members
  alter column registered_at set not null;

alter table public.members
  drop constraint if exists members_status_check;

alter table public.members
  add constraint members_status_check
  check (status in ('active', 'dormant', 'terminated'));

create index if not exists members_status_idx on public.members (status);
create index if not exists members_trainer_name_idx on public.members (trainer_name);
create index if not exists members_registered_at_idx on public.members (registered_at);
create index if not exists members_expires_at_idx on public.members (expires_at);
