-- 구매 계약서 (PT / 센터이용권) — 결제 요청 연동, 전자 서명
-- Supabase SQL Editor에서 실행하세요.

create table if not exists public.contract_instances (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid not null unique references public.payment_requests (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  contract_type text not null check (
    contract_type in ('pt_purchase', 'center_pass_purchase')
  ),
  status text not null default 'pending_signature' check (
    status in ('pending_signature', 'signed', 'cancelled')
  ),
  field_data jsonb not null default '{}'::jsonb,
  terms_accepted jsonb not null default '{}'::jsonb,
  signature_path text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contract_instances_member_id_idx
  on public.contract_instances (member_id);

create index if not exists contract_instances_status_idx
  on public.contract_instances (status);

create index if not exists contract_instances_created_at_idx
  on public.contract_instances (created_at desc);

alter table public.contract_instances enable row level security;

drop policy if exists contract_instances_all on public.contract_instances;
create policy contract_instances_all on public.contract_instances
  for all using (true) with check (true);

drop trigger if exists contract_instances_updated_at on public.contract_instances;
create trigger contract_instances_updated_at
  before update on public.contract_instances
  for each row execute function public.set_updated_at();

-- 전자 서명 이미지 저장
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contracts',
  'contracts',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists contracts_storage_all on storage.objects;
create policy contracts_storage_all on storage.objects
  for all using (bucket_id = 'contracts')
  with check (bucket_id = 'contracts');
