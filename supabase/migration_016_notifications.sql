-- 알림톡/문자 발송 이력 (솔라피 연동)
-- Supabase SQL Editor에서 실행하거나 fix_all.sql에 포함된 섹션을 사용하세요.

create table if not exists public.message_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members (id) on delete set null,
  phone text not null,
  template_key text not null check (
    template_key in ('welcome', 'payment_done', 'renewal')
  ),
  channel text check (channel in ('alimtalk', 'sms', 'skipped')),
  status text not null default 'pending' check (
    status in ('pending', 'sent', 'failed', 'skipped')
  ),
  provider_message_id text,
  error_message text,
  variables jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists message_logs_member_id_idx
  on public.message_logs (member_id);

create index if not exists message_logs_template_key_idx
  on public.message_logs (template_key);

create index if not exists message_logs_created_at_idx
  on public.message_logs (created_at desc);

create index if not exists message_logs_status_idx
  on public.message_logs (status);

create index if not exists message_logs_renewal_dedup_idx
  on public.message_logs (member_id, template_key, ((metadata ->> 'days_left')))
  where template_key = 'renewal';

alter table public.message_logs enable row level security;

drop policy if exists message_logs_all on public.message_logs;
create policy message_logs_all on public.message_logs
  for all using (true) with check (true);
