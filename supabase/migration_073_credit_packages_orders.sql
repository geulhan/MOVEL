-- 메시지 크레딧 상거래 기초 (결제 연동 전)
-- migration_071 이후 실행
-- @see docs/message-credit-payment-design.md

-- ---------------------------------------------------------------------------
-- 1. credit_packages (판매 패키지 카탈로그)
-- ---------------------------------------------------------------------------
create table if not exists public.credit_packages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  quantity integer not null check (quantity > 0),
  label text not null,
  price_krw numeric(12, 0) not null default 0 check (price_krw >= 0),
  currency text not null default 'KRW',
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists credit_packages_active_sort_idx
  on public.credit_packages (is_active, sort_order);

-- ---------------------------------------------------------------------------
-- 2. credit_orders (결제 주문 — 2단계 PG 연동용, 1단계는 비어 있음)
-- ---------------------------------------------------------------------------
create table if not exists public.credit_orders (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  package_id uuid references public.credit_packages (id) on delete set null,
  credits integer not null check (credits > 0),
  amount_krw numeric(12, 0) not null default 0 check (amount_krw >= 0),
  currency text not null default 'KRW',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled', 'refund')),
  payment_provider text check (payment_provider in ('toss', 'manual')),
  provider_order_id text,
  provider_payment_key text,
  provider_receipt_url text,
  credit_transaction_id uuid,
  order_name text,
  buyer_email text,
  buyer_name text,
  paid_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists credit_orders_center_status_idx
  on public.credit_orders (center_id, status, created_at desc);

create index if not exists credit_orders_provider_order_idx
  on public.credit_orders (payment_provider, provider_order_id)
  where provider_order_id is not null;

create unique index if not exists credit_orders_provider_payment_key_uidx
  on public.credit_orders (provider_payment_key)
  where provider_payment_key is not null;

-- ---------------------------------------------------------------------------
-- 3. triggers
-- ---------------------------------------------------------------------------
drop trigger if exists credit_packages_updated_at on public.credit_packages;
create trigger credit_packages_updated_at
  before update on public.credit_packages
  for each row execute function public.set_updated_at();

drop trigger if exists credit_orders_updated_at on public.credit_orders;
create trigger credit_orders_updated_at
  before update on public.credit_orders
  for each row execute function public.set_updated_at();

alter table public.credit_packages enable row level security;
alter table public.credit_orders enable row level security;

-- ---------------------------------------------------------------------------
-- 4. 패키지 시드 (100 / 500 / 1000)
-- ---------------------------------------------------------------------------
insert into public.credit_packages (code, quantity, label, price_krw, sort_order, description)
select v.code, v.quantity, v.label, v.price_krw, v.sort_order, v.description
from (
  values
    ('pkg_100', 100, '100건', 0::numeric, 1, '메시지 크레딧 100건'),
    ('pkg_500', 500, '500건', 0::numeric, 2, '메시지 크레딧 500건'),
    ('pkg_1000', 1000, '1,000건', 0::numeric, 3, '메시지 크레딧 1,000건')
) as v(code, quantity, label, price_krw, sort_order, description)
where not exists (
  select 1 from public.credit_packages cp where cp.code = v.code
);

-- migration_065 message_credit_products → credit_packages 가격 이전 (있을 경우)
update public.credit_packages cp
set
  price_krw = mcp.price,
  label = mcp.label,
  sort_order = mcp.sort_order,
  updated_at = now()
from public.message_credit_products mcp
where cp.quantity = mcp.quantity
  and mcp.is_active = true;

-- ---------------------------------------------------------------------------
-- 5. 향후 토스 연동용 RPC (스텁 — 앱에서 호출하지 않음)
-- ---------------------------------------------------------------------------
create or replace function public.create_credit_order(
  p_center_id uuid,
  p_package_id uuid,
  p_expires_minutes integer default 30
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pkg public.credit_packages%rowtype;
  v_order public.credit_orders%rowtype;
  v_expires timestamptz;
begin
  if p_center_id is null or p_package_id is null then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  select * into v_pkg
  from public.credit_packages
  where id = p_package_id and is_active = true;

  if v_pkg.id is null then
    return json_build_object('ok', false, 'error', 'package_not_found');
  end if;

  v_expires := now() + (greatest(coalesce(p_expires_minutes, 30), 5) || ' minutes')::interval;

  insert into public.credit_orders (
    center_id,
    package_id,
    credits,
    amount_krw,
    currency,
    status,
    payment_provider,
    order_name,
    expires_at,
    metadata
  )
  values (
    p_center_id,
    v_pkg.id,
    v_pkg.quantity,
    v_pkg.price_krw,
    v_pkg.currency,
    'pending',
    'toss',
    v_pkg.label || ' 충전',
    v_expires,
    jsonb_build_object('package_code', v_pkg.code)
  )
  returning * into v_order;

  return json_build_object(
    'ok', true,
    'order_id', v_order.id,
    'credits', v_order.credits,
    'amount_krw', v_order.amount_krw,
    'order_name', v_order.order_name,
    'expires_at', v_order.expires_at
  );
end;
$$;

create or replace function public.fulfill_credit_order(
  p_order_id uuid,
  p_provider_payment_key text default null,
  p_provider_receipt_url text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.credit_orders%rowtype;
  v_grant json;
  v_tx_id uuid;
begin
  select * into v_order
  from public.credit_orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    return json_build_object('ok', false, 'error', 'order_not_found');
  end if;

  if v_order.status = 'paid' then
    return json_build_object('ok', true, 'already_fulfilled', true, 'order_id', v_order.id);
  end if;

  if v_order.status <> 'pending' then
    return json_build_object('ok', false, 'error', 'invalid_status', 'status', v_order.status);
  end if;

  if v_order.expires_at is not null and v_order.expires_at < now() then
    update public.credit_orders
    set status = 'cancelled', cancelled_at = now(), updated_at = now()
    where id = v_order.id;
    return json_build_object('ok', false, 'error', 'order_expired');
  end if;

  v_grant := public.grant_message_credits(
    v_order.center_id,
    v_order.credits,
    'purchase',
    '크레딧 충전 (' || v_order.order_name || ')',
    jsonb_build_object(
      'credit_order_id', v_order.id,
      'package_id', v_order.package_id,
      'payment_provider', v_order.payment_provider
    )
  );

  if (v_grant->>'ok')::boolean is not true then
    return v_grant;
  end if;

  select id into v_tx_id
  from public.message_credit_transactions
  where center_id = v_order.center_id
    and type = 'purchase'
    and (metadata->>'credit_order_id')::text = v_order.id::text
  order by created_at desc
  limit 1;

  update public.credit_orders
  set
    status = 'paid',
    provider_payment_key = coalesce(p_provider_payment_key, provider_payment_key),
    provider_receipt_url = coalesce(p_provider_receipt_url, provider_receipt_url),
    credit_transaction_id = v_tx_id,
    paid_at = now(),
    updated_at = now()
  where id = v_order.id;

  return json_build_object(
    'ok', true,
    'order_id', v_order.id,
    'balance', v_grant->'balance',
    'credits', v_order.credits
  );
end;
$$;

revoke all on function public.create_credit_order(uuid, uuid, integer) from public;
revoke all on function public.fulfill_credit_order(uuid, text, text) from public;

-- service_role / 향후 Edge webhook only
grant execute on function public.create_credit_order(uuid, uuid, integer) to service_role;
grant execute on function public.fulfill_credit_order(uuid, text, text) to service_role;

comment on table public.credit_packages is
  '메시지 크레딧 판매 패키지. 2단계 토스 연동 시 사용.';
comment on table public.credit_orders is
  '크레딧 충전 주문. 1단계 베타는 수동 지급만 사용, orders 비어 있음.';
comment on function public.create_credit_order is
  '향후 결제창 오픈 전 주문 생성 (미연동).';
comment on function public.fulfill_credit_order is
  '향후 PG webhook에서 결제 완료 후 크레딧 지급.';
