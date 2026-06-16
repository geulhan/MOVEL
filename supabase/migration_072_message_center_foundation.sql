-- 메시지센터 기초 스키마 (운영 발송 로직 변경 없음)
-- migration_071 이후 실행
-- @see docs/message-center-architecture.md

-- ---------------------------------------------------------------------------
-- 1. message_templates
-- ---------------------------------------------------------------------------
create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  center_id uuid references public.centers (id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  channel_type text not null default 'alimtalk'
    check (channel_type in ('alimtalk', 'sms', 'lms')),
  solapi_template_id text,
  variables_schema jsonb not null default '{}'::jsonb,
  usage_scope text not null default 'automatic'
    check (usage_scope in ('automatic', 'announcement', 'direct', 'campaign', 'all')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists message_templates_center_code_uidx
  on public.message_templates (coalesce(center_id, '00000000-0000-0000-0000-000000000000'::uuid), code);

create index if not exists message_templates_center_active_idx
  on public.message_templates (center_id, is_active);

-- ---------------------------------------------------------------------------
-- 2. message_campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.message_campaigns (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  campaign_kind text not null
    check (campaign_kind in ('automatic', 'announcement', 'direct', 'crm')),
  dispatch_type text not null
    check (dispatch_type in ('automatic', 'announcement', 'direct', 'campaign')),
  name text not null,
  description text,
  template_id uuid references public.message_templates (id) on delete set null,
  trigger_config jsonb not null default '{}'::jsonb,
  audience_config jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'draft', 'scheduled', 'running', 'completed', 'cancelled')),
  is_enabled boolean not null default true,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists message_campaigns_center_kind_idx
  on public.message_campaigns (center_id, campaign_kind, is_enabled);

create index if not exists message_campaigns_center_dispatch_idx
  on public.message_campaigns (center_id, dispatch_type, status);

-- ---------------------------------------------------------------------------
-- 3. notification_history
-- ---------------------------------------------------------------------------
create table if not exists public.notification_history (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  campaign_id uuid references public.message_campaigns (id) on delete set null,
  dispatch_type text not null
    check (dispatch_type in ('automatic', 'announcement', 'direct', 'campaign')),
  batch_id uuid,
  member_id uuid references public.members (id) on delete set null,
  phone text not null,
  template_id uuid references public.message_templates (id) on delete set null,
  template_code text,
  channel text check (channel in ('alimtalk', 'sms', 'lms', 'skipped')),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  error_message text,
  variables jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  credits_charged integer not null default 0 check (credits_charged >= 0),
  dedup_key text,
  resend_of_id uuid references public.notification_history (id) on delete set null,
  message_log_id uuid references public.message_logs (id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notification_history_center_created_idx
  on public.notification_history (center_id, created_at desc);

create index if not exists notification_history_center_dispatch_idx
  on public.notification_history (center_id, dispatch_type, created_at desc);

create index if not exists notification_history_campaign_idx
  on public.notification_history (campaign_id)
  where campaign_id is not null;

create index if not exists notification_history_batch_idx
  on public.notification_history (batch_id)
  where batch_id is not null;

create index if not exists notification_history_member_idx
  on public.notification_history (member_id, created_at desc)
  where member_id is not null;

create unique index if not exists notification_history_dedup_uidx
  on public.notification_history (center_id, dedup_key)
  where dedup_key is not null;

-- ---------------------------------------------------------------------------
-- 4. triggers
-- ---------------------------------------------------------------------------
drop trigger if exists message_templates_updated_at on public.message_templates;
create trigger message_templates_updated_at
  before update on public.message_templates
  for each row execute function public.set_updated_at();

drop trigger if exists message_campaigns_updated_at on public.message_campaigns;
create trigger message_campaigns_updated_at
  before update on public.message_campaigns
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. RLS (service / RPC only — 센터 앱은 기존 RPC 경유)
-- ---------------------------------------------------------------------------
alter table public.message_templates enable row level security;
alter table public.message_campaigns enable row level security;
alter table public.notification_history enable row level security;

-- ---------------------------------------------------------------------------
-- 6. 플랫폼 기본 템플릿 시드 (center_id NULL = 공통)
-- ---------------------------------------------------------------------------
insert into public.message_templates (
  center_id, code, name, channel_type, usage_scope, variables_schema, sort_order
)
select v.center_id, v.code, v.name, v.channel_type, v.usage_scope, v.variables_schema, v.sort_order
from (
  values
    (null::uuid, 'welcome', '신규 가입 환영', 'alimtalk', 'automatic', '{"#{name}":"회원명","#{centerName}":"센터명","#{portalUrl}":"포털 URL"}'::jsonb, 1),
    (null::uuid, 'payment_done', '결제 완료', 'alimtalk', 'automatic', '{"#{name}":"회원명","#{amount}":"금액","#{sessions}":"횟수"}'::jsonb, 2),
    (null::uuid, 'renewal', '갱신 안내', 'alimtalk', 'automatic', '{"#{name}":"회원명","#{expiresAt}":"만료일","#{daysLeft}":"잔여일"}'::jsonb, 3),
    (null::uuid, 'pt_reminder', 'PT 예약 리마인더', 'alimtalk', 'automatic', '{"#{name}":"회원명","#{scheduledAt}":"예약일시","#{trainerName}":"트레이너"}'::jsonb, 4),
    (null::uuid, 'step_verification_result', '만보 인증 결과', 'alimtalk', 'automatic', '{"#{name}":"회원명"}'::jsonb, 5),
    (null::uuid, 'announcement_freeform', '공지 (자유 작성)', 'alimtalk', 'announcement', '{"#{name}":"회원명","#{body}":"본문"}'::jsonb, 10),
    (null::uuid, 'direct_freeform', '개별 메시지', 'alimtalk', 'direct', '{"#{name}":"회원명","#{body}":"본문"}'::jsonb, 11),
    (null::uuid, 'crm_default', 'CRM 캠페인', 'alimtalk', 'campaign', '{"#{name}":"회원명","#{body}":"본문"}'::jsonb, 12)
) as v(center_id, code, name, channel_type, usage_scope, variables_schema, sort_order)
where not exists (
  select 1 from public.message_templates t
  where t.center_id is null and t.code = v.code
);

-- ---------------------------------------------------------------------------
-- 7. 센터별 자동발송 캠페인 시드 (기존 동작과 1:1 매핑)
-- ---------------------------------------------------------------------------
create or replace function public.seed_center_automatic_campaigns(p_center_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tpl uuid;
begin
  if p_center_id is null then return; end if;

  -- welcome
  select id into v_tpl from public.message_templates
  where center_id is null and code = 'welcome' limit 1;
  if v_tpl is not null and not exists (
    select 1 from public.message_campaigns
    where center_id = p_center_id and metadata->>'seed_code' = 'auto_welcome'
  ) then
    insert into public.message_campaigns (
      center_id, campaign_kind, dispatch_type, name, template_id,
      trigger_config, status, is_enabled, metadata
    ) values (
      p_center_id, 'automatic', 'automatic', '신규회원 환영', v_tpl,
      '{"event":"member_welcome","dedup_scope":["member_id"]}'::jsonb,
      'active', true, '{"seed_code":"auto_welcome","legacy_template_key":"welcome"}'::jsonb
    );
  end if;

  -- payment_done
  select id into v_tpl from public.message_templates
  where center_id is null and code = 'payment_done' limit 1;
  if v_tpl is not null and not exists (
    select 1 from public.message_campaigns
    where center_id = p_center_id and metadata->>'seed_code' = 'auto_payment_done'
  ) then
    insert into public.message_campaigns (
      center_id, campaign_kind, dispatch_type, name, template_id,
      trigger_config, status, is_enabled, metadata
    ) values (
      p_center_id, 'automatic', 'automatic', '결제 완료 안내', v_tpl,
      '{"event":"payment_completed","dedup_scope":["member_id","payment_id"]}'::jsonb,
      'active', true, '{"seed_code":"auto_payment_done","legacy_template_key":"payment_done"}'::jsonb
    );
  end if;

  -- renewal
  select id into v_tpl from public.message_templates
  where center_id is null and code = 'renewal' limit 1;
  if v_tpl is not null and not exists (
    select 1 from public.message_campaigns
    where center_id = p_center_id and metadata->>'seed_code' = 'auto_renewal'
  ) then
    insert into public.message_campaigns (
      center_id, campaign_kind, dispatch_type, name, template_id,
      trigger_config, status, is_enabled, metadata
    ) values (
      p_center_id, 'automatic', 'automatic', '재등록 안내 (D-7/3/1)', v_tpl,
      '{"event":"membership_renewal","days_before":[7,3,1],"dedup_scope":["member_id","days_left"]}'::jsonb,
      'active', true, '{"seed_code":"auto_renewal","legacy_template_key":"renewal"}'::jsonb
    );
  end if;

  -- pt_reminder
  select id into v_tpl from public.message_templates
  where center_id is null and code = 'pt_reminder' limit 1;
  if v_tpl is not null and not exists (
    select 1 from public.message_campaigns
    where center_id = p_center_id and metadata->>'seed_code' = 'auto_pt_reminder'
  ) then
    insert into public.message_campaigns (
      center_id, campaign_kind, dispatch_type, name, template_id,
      trigger_config, status, is_enabled, metadata
    ) values (
      p_center_id, 'automatic', 'automatic', 'PT D-1 리마인더', v_tpl,
      '{"event":"pt_schedule_reminder","offset_hours":24,"window_hours":1,"dedup_scope":["member_id","schedule_id"]}'::jsonb,
      'active', true, '{"seed_code":"auto_pt_reminder","legacy_template_key":"pt_reminder"}'::jsonb
    );
  end if;

  -- 향후 자동발송 (비활성 시드)
  if not exists (
    select 1 from public.message_campaigns
    where center_id = p_center_id and metadata->>'seed_code' = 'auto_pt_sessions_3'
  ) then
    insert into public.message_campaigns (
      center_id, campaign_kind, dispatch_type, name, template_id,
      trigger_config, status, is_enabled, metadata
    ) values (
      p_center_id, 'automatic', 'automatic', 'PT 잔여 3회 안내', null,
      '{"event":"pt_sessions_threshold","sessions_threshold":3,"dedup_scope":["member_id","threshold"]}'::jsonb,
      'draft', false, '{"seed_code":"auto_pt_sessions_3"}'::jsonb
    );
  end if;

  if not exists (
    select 1 from public.message_campaigns
    where center_id = p_center_id and metadata->>'seed_code' = 'auto_pt_sessions_1'
  ) then
    insert into public.message_campaigns (
      center_id, campaign_kind, dispatch_type, name, template_id,
      trigger_config, status, is_enabled, metadata
    ) values (
      p_center_id, 'automatic', 'automatic', 'PT 잔여 1회 안내', null,
      '{"event":"pt_sessions_threshold","sessions_threshold":1,"dedup_scope":["member_id","threshold"]}'::jsonb,
      'draft', false, '{"seed_code":"auto_pt_sessions_1"}'::jsonb
    );
  end if;

  if not exists (
    select 1 from public.message_campaigns
    where center_id = p_center_id and metadata->>'seed_code' = 'auto_membership_expiry'
  ) then
    insert into public.message_campaigns (
      center_id, campaign_kind, dispatch_type, name, template_id,
      trigger_config, status, is_enabled, metadata
    ) values (
      p_center_id, 'automatic', 'automatic', '회원권 만료 안내', null,
      '{"event":"membership_expiry","dedup_scope":["member_id","expires_at"]}'::jsonb,
      'draft', false, '{"seed_code":"auto_membership_expiry"}'::jsonb
    );
  end if;

  if not exists (
    select 1 from public.message_campaigns
    where center_id = p_center_id and metadata->>'seed_code' = 'auto_class_reminder'
  ) then
    insert into public.message_campaigns (
      center_id, campaign_kind, dispatch_type, name, template_id,
      trigger_config, status, is_enabled, metadata
    ) values (
      p_center_id, 'automatic', 'automatic', '수업 D-1 리마인더', null,
      '{"event":"class_schedule_reminder","offset_hours":24,"dedup_scope":["member_id","schedule_id"]}'::jsonb,
      'draft', false, '{"seed_code":"auto_class_reminder"}'::jsonb
    );
  end if;
end;
$$;

-- 기존 센터 백필
select public.seed_center_automatic_campaigns(c.id)
from public.centers c
where c.deleted_at is null;

-- 신규 센터 자동 시드
create or replace function public.on_center_created_message_campaigns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_center_automatic_campaigns(new.id);
  return new;
end;
$$;

drop trigger if exists centers_message_campaigns_seed on public.centers;
create trigger centers_message_campaigns_seed
  after insert on public.centers
  for each row
  execute function public.on_center_created_message_campaigns();

revoke all on function public.seed_center_automatic_campaigns(uuid) from public;

comment on table public.message_templates is
  '알림톡/문자 템플릿 메타. center_id NULL = 플랫폼 공통.';
comment on table public.message_campaigns is
  '자동발송 규칙·공지·CRM 캠페인 정의. 현재 운영은 message_logs 병행.';
comment on table public.notification_history is
  '통합 발송 이력. dispatch_type으로 automatic/announcement/direct/campaign 구분.';
