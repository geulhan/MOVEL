-- 온라인 결제 기반: PT 기본 가격 설정 + 관리자 결제 요청
-- Supabase SQL Editor에서 실행하세요.

-- PT 패키지 기본 가격 (reward_settings 패턴 재사용)
insert into public.reward_settings (branch_id, setting_key, setting_value, description)
values (
  null,
  'pt_pricing',
  '{
    "packages": [
      {"id": "pt_10", "label": "PT 10회", "sessions": 10, "amount": 800000, "is_active": true, "sort_order": 1},
      {"id": "pt_20", "label": "PT 20회", "sessions": 20, "amount": 1500000, "is_active": true, "sort_order": 2},
      {"id": "pt_30", "label": "PT 30회", "sessions": 30, "amount": 2100000, "is_active": true, "sort_order": 3}
    ]
  }'::jsonb,
  'PT 회원권 기본 가격 (관리자 화면에서 수정 가능)'
)
on conflict (branch_id, setting_key) do nothing;

-- 관리자 → 회원 결제 요청 (할인가 포함)
create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  status text not null default 'pending' check (
    status in ('pending', 'paid', 'cancelled', 'expired')
  ),
  package_id text,
  label text not null,
  sessions integer not null check (sessions >= 1),
  list_amount numeric(12, 0) not null check (list_amount >= 0),
  amount numeric(12, 0) not null check (amount >= 0),
  discount_amount numeric(12, 0) not null default 0 check (discount_amount >= 0),
  discount_note text,
  note text,
  payment_history_id uuid references public.payment_history (id) on delete set null,
  pg_provider text,
  pg_order_id text,
  pg_payment_key text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_by text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_requests_member_id_idx
  on public.payment_requests (member_id);

create index if not exists payment_requests_status_idx
  on public.payment_requests (status);

create index if not exists payment_requests_created_at_idx
  on public.payment_requests (created_at desc);

create index if not exists payment_requests_pending_member_idx
  on public.payment_requests (member_id)
  where status = 'pending';

alter table public.payment_requests enable row level security;

drop policy if exists payment_requests_all on public.payment_requests;
create policy payment_requests_all on public.payment_requests
  for all using (true) with check (true);

drop trigger if exists payment_requests_updated_at on public.payment_requests;
create trigger payment_requests_updated_at
  before update on public.payment_requests
  for each row execute function public.set_updated_at();

-- 결제 완료 시 출처 추적 (선택)
alter table public.payment_history
  add column if not exists source text not null default 'admin',
  add column if not exists payment_request_id uuid references public.payment_requests (id) on delete set null;
