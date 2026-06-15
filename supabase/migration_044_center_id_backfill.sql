-- MotionHub SaaS: center_id 미적용 테이블 백필
-- migration_043 이후 실행

-- ---------------------------------------------------------------------------
-- 1. center_id 컬럼 추가
-- ---------------------------------------------------------------------------
alter table public.period_extensions
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.member_memos
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.consultation_records
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.reward_settings
  add column if not exists center_id uuid references public.centers (id) on delete cascade;

alter table public.reward_mile_lots
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.member_daily_activity
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.member_referral_rewards
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.center_photo_submissions
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.center_pass_products
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.center_passes
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.facility_products
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.member_facility_subscriptions
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.contract_instances
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

alter table public.member_inbody_records
  add column if not exists center_id uuid references public.centers (id) on delete restrict;

-- ---------------------------------------------------------------------------
-- 2. 백필
-- ---------------------------------------------------------------------------
do $$
declare
  v_center_id uuid;
begin
  select public.get_default_center_id() into v_center_id;
  if v_center_id is null then
    raise exception 'default center (slug=movel) not found';
  end if;

  update public.period_extensions pe
  set center_id = m.center_id
  from public.members m
  where pe.member_id = m.id and pe.center_id is null;

  update public.member_memos mm
  set center_id = m.center_id
  from public.members m
  where mm.member_id = m.id and mm.center_id is null;

  update public.consultation_records cr
  set center_id = m.center_id
  from public.members m
  where cr.member_id = m.id and cr.center_id is null;

  update public.reward_mile_lots rml
  set center_id = m.center_id
  from public.members m
  where rml.member_id = m.id and rml.center_id is null;

  update public.member_daily_activity mda
  set center_id = m.center_id
  from public.members m
  where mda.member_id = m.id and mda.center_id is null;

  update public.member_referral_rewards mrr
  set center_id = m.center_id
  from public.members m
  where mrr.member_id = m.id and mrr.center_id is null;

  update public.center_photo_submissions cps
  set center_id = m.center_id
  from public.members m
  where cps.member_id = m.id and cps.center_id is null;

  update public.center_passes cp
  set center_id = m.center_id
  from public.members m
  where cp.member_id = m.id and cp.center_id is null;

  update public.member_facility_subscriptions mfs
  set center_id = m.center_id
  from public.members m
  where mfs.member_id = m.id and mfs.center_id is null;

  update public.contract_instances ci
  set center_id = m.center_id
  from public.members m
  where ci.member_id = m.id and ci.center_id is null;

  update public.member_inbody_records mir
  set center_id = m.center_id
  from public.members m
  where mir.member_id = m.id and mir.center_id is null;

  update public.reward_settings
  set center_id = v_center_id
  where center_id is null;

  update public.center_pass_products
  set center_id = v_center_id
  where center_id is null;

  update public.facility_products
  set center_id = v_center_id
  where center_id is null;

  update public.period_extensions set center_id = v_center_id where center_id is null;
  update public.member_memos set center_id = v_center_id where center_id is null;
  update public.consultation_records set center_id = v_center_id where center_id is null;
  update public.reward_mile_lots set center_id = v_center_id where center_id is null;
  update public.member_daily_activity set center_id = v_center_id where center_id is null;
  update public.member_referral_rewards set center_id = v_center_id where center_id is null;
  update public.center_photo_submissions set center_id = v_center_id where center_id is null;
  update public.center_passes set center_id = v_center_id where center_id is null;
  update public.member_facility_subscriptions set center_id = v_center_id where center_id is null;
  update public.contract_instances set center_id = v_center_id where center_id is null;
  update public.member_inbody_records set center_id = v_center_id where center_id is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. NOT NULL + 인덱스
-- ---------------------------------------------------------------------------
alter table public.period_extensions alter column center_id set not null;
alter table public.member_memos alter column center_id set not null;
alter table public.consultation_records alter column center_id set not null;
alter table public.reward_settings alter column center_id set not null;
alter table public.reward_mile_lots alter column center_id set not null;
alter table public.member_daily_activity alter column center_id set not null;
alter table public.member_referral_rewards alter column center_id set not null;
alter table public.center_photo_submissions alter column center_id set not null;
alter table public.center_pass_products alter column center_id set not null;
alter table public.center_passes alter column center_id set not null;
alter table public.facility_products alter column center_id set not null;
alter table public.member_facility_subscriptions alter column center_id set not null;
alter table public.contract_instances alter column center_id set not null;
alter table public.member_inbody_records alter column center_id set not null;

create index if not exists period_extensions_center_id_idx on public.period_extensions (center_id);
create index if not exists member_memos_center_id_idx on public.member_memos (center_id);
create index if not exists consultation_records_center_id_idx on public.consultation_records (center_id);
create index if not exists reward_settings_center_id_idx on public.reward_settings (center_id);
create index if not exists reward_mile_lots_center_id_idx on public.reward_mile_lots (center_id);
create index if not exists member_daily_activity_center_id_idx on public.member_daily_activity (center_id);
create index if not exists member_referral_rewards_center_id_idx on public.member_referral_rewards (center_id);
create index if not exists center_photo_submissions_center_id_idx on public.center_photo_submissions (center_id);
create index if not exists center_pass_products_center_id_idx on public.center_pass_products (center_id);
create index if not exists center_passes_center_id_idx on public.center_passes (center_id);
create index if not exists facility_products_center_id_idx on public.facility_products (center_id);
create index if not exists member_facility_subscriptions_center_id_idx on public.member_facility_subscriptions (center_id);
create index if not exists contract_instances_center_id_idx on public.contract_instances (center_id);
create index if not exists member_inbody_records_center_id_idx on public.member_inbody_records (center_id);
