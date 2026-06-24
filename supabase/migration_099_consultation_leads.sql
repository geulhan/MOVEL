-- 상담·리드 관리 (회원 등록 전 문의)
-- 보관: 무기명 60일 · 연락처 보유 6개월(마지막 활동 기준)

create table if not exists public.consultation_leads (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  display_name text not null default '무기명',
  display_label text,
  legal_name text,
  phone text,
  identity_level text not null default 'anonymous' check (
    identity_level in ('anonymous', 'phone_only', 'identified')
  ),
  source text not null default 'other' check (
    source in ('phone', 'visit', 'instagram', 'referral', 'web', 'other')
  ),
  interest text not null default 'other' check (
    interest in ('pt', 'pilates', 'trial', 'price', 'other')
  ),
  message text not null default '',
  status text not null default 'new' check (
    status in (
      'new',
      'contacted',
      'trial_scheduled',
      'trial_done',
      'pending_register',
      'converted',
      'on_hold',
      'lost'
    )
  ),
  assigned_trainer_id uuid references public.trainers (id) on delete set null,
  assigned_trainer_name text,
  agree_privacy boolean not null default false,
  agree_marketing boolean not null default false,
  agree_marketing_at timestamptz,
  next_contact_at date,
  last_activity_at timestamptz not null default now(),
  retention_until timestamptz not null default (now() + interval '60 days'),
  converted_member_id uuid references public.members (id) on delete set null,
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consultation_leads_center_id_idx
  on public.consultation_leads (center_id);

create index if not exists consultation_leads_status_idx
  on public.consultation_leads (center_id, status);

create index if not exists consultation_leads_retention_idx
  on public.consultation_leads (center_id, retention_until);

create index if not exists consultation_leads_phone_idx
  on public.consultation_leads (center_id, phone)
  where phone is not null;

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.consultation_leads (id) on delete cascade,
  center_id uuid not null references public.centers (id) on delete cascade,
  activity_type text not null check (
    activity_type in (
      'note',
      'call',
      'status_change',
      'name_confirmed',
      'phone_added',
      'converted',
      'privacy_agreed',
      'marketing_agreed'
    )
  ),
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lead_activities_lead_id_idx
  on public.lead_activities (lead_id, created_at desc);

alter table public.consultation_leads enable row level security;
alter table public.lead_activities enable row level security;

drop policy if exists consultation_leads_all on public.consultation_leads;
create policy consultation_leads_all on public.consultation_leads
  for all using (true) with check (true);

drop policy if exists lead_activities_all on public.lead_activities;
create policy lead_activities_all on public.lead_activities
  for all using (true) with check (true);

create or replace function public.consultation_leads_compute_derived()
returns trigger
language plpgsql
as $$
declare
  v_phone text;
  v_name text;
  v_label text;
begin
  v_phone := nullif(trim(coalesce(new.phone, '')), '');
  v_name := nullif(trim(coalesce(new.legal_name, '')), '');
  v_label := nullif(trim(coalesce(new.display_label, '')), '');

  if v_name is not null then
    new.identity_level := 'identified';
    new.display_name := v_name;
  elsif v_phone is not null then
    new.identity_level := 'phone_only';
    if length(regexp_replace(v_phone, '\D', '', 'g')) >= 4 then
      new.display_name := regexp_replace(
        v_phone,
        '(\d{3})[\d-]*(\d{4})$',
        '\1-****-\2'
      );
    else
      new.display_name := v_phone;
    end if;
  else
    new.identity_level := 'anonymous';
    new.display_name := coalesce(v_label, '무기명');
  end if;

  if new.identity_level = 'anonymous' then
    new.retention_until := new.created_at + interval '60 days';
  else
    new.retention_until := coalesce(new.last_activity_at, new.created_at, now()) + interval '6 months';
  end if;

  if new.converted_member_id is not null then
    new.retention_until := greatest(
      new.retention_until,
      coalesce(new.converted_at, now()) + interval '30 days'
    );
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists consultation_leads_compute_derived_trg on public.consultation_leads;
create trigger consultation_leads_compute_derived_trg
  before insert or update on public.consultation_leads
  for each row
  execute function public.consultation_leads_compute_derived();

create or replace function public.purge_expired_consultation_leads(p_center_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.consultation_leads cl
  where cl.retention_until < now()
    and cl.converted_member_id is null
    and (p_center_id is null or cl.center_id = p_center_id);

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.purge_expired_consultation_leads(uuid) from public;
grant execute on function public.purge_expired_consultation_leads(uuid) to anon, authenticated, service_role;
