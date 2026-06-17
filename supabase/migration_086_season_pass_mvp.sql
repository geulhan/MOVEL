-- MotionHub 시즌 패스 MVP (무료 패스 · season_xp)
-- migration_085 이후 실행

-- ---------------------------------------------------------------------------
-- 1. 정원 시즌 한정 아이템 확장
-- ---------------------------------------------------------------------------

alter table public.garden_shop_items
  add column if not exists is_shop_visible boolean not null default true;

alter table public.garden_shop_items
  drop constraint if exists garden_shop_items_cost_acorns_check;

alter table public.garden_shop_items
  add constraint garden_shop_items_cost_acorns_check
  check (cost_acorns >= 0);

alter table public.garden_shop_items
  drop constraint if exists garden_shop_items_item_type_check;

alter table public.garden_shop_items
  add constraint garden_shop_items_item_type_check
  check (
    item_type in (
      'flower',
      'bench',
      'street_lamp',
      'stone_path',
      'pond',
      'flower_bed',
      'rare_tree',
      'season_fountain'
    )
  );

insert into public.garden_shop_items (
  item_name, item_type, cost_acorns, sprite_key, sort_order, is_shop_visible
)
values
  ('꽃밭', 'flower_bed', 0, 'flower_bed', 101, false),
  ('희귀 나무', 'rare_tree', 0, 'rare_tree', 102, false),
  ('시즌 한정 분수', 'season_fountain', 0, 'season_fountain', 103, false)
on conflict (sprite_key) do update
set
  item_name = excluded.item_name,
  item_type = excluded.item_type,
  is_shop_visible = false,
  is_active = true;

-- ---------------------------------------------------------------------------
-- 2. 시즌 마스터
-- ---------------------------------------------------------------------------

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  title text not null,
  description text not null default '',
  start_date date not null,
  end_date date not null,
  max_level integer not null default 20 check (max_level > 0 and max_level <= 50),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint seasons_date_range_check check (end_date >= start_date)
);

create index if not exists seasons_center_active_idx
  on public.seasons (center_id, is_active, start_date desc);

-- ---------------------------------------------------------------------------
-- 3. 시즌 레벨 보상
-- ---------------------------------------------------------------------------

create table if not exists public.season_rewards (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  level integer not null check (level > 0),
  xp_required integer not null check (xp_required > 0),
  reward_type text not null check (
    reward_type in ('acorns', 'garden_item', 'limited_item')
  ),
  reward_acorns integer not null default 0 check (reward_acorns >= 0),
  garden_shop_item_id uuid references public.garden_shop_items (id) on delete set null,
  title text not null,
  description text not null default '',
  icon text not null default '🎁',
  sprite_key text,
  sort_order integer not null default 0,
  constraint season_rewards_season_level_key unique (season_id, level)
);

create index if not exists season_rewards_season_level_idx
  on public.season_rewards (season_id, level);

-- ---------------------------------------------------------------------------
-- 4. 회원 시즌 진행도 (시즌 종료 시 새 시즌 = 새 row)
-- ---------------------------------------------------------------------------

create table if not exists public.user_season_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.platform_users (id) on delete cascade,
  season_id uuid not null references public.seasons (id) on delete cascade,
  season_xp integer not null default 0 check (season_xp >= 0),
  current_level integer not null default 0 check (current_level >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_season_progress_user_season_key unique (user_id, season_id)
);

create index if not exists user_season_progress_user_idx
  on public.user_season_progress (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- 5. 보상 수령 기록
-- ---------------------------------------------------------------------------

create table if not exists public.user_season_reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.platform_users (id) on delete cascade,
  season_id uuid not null references public.seasons (id) on delete cascade,
  season_reward_id uuid not null references public.season_rewards (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  constraint user_season_reward_claims_user_reward_key unique (user_id, season_reward_id)
);

-- ---------------------------------------------------------------------------
-- 6. 시즌 XP 이벤트 (중복 방지 · 성장치와 별도)
-- ---------------------------------------------------------------------------

create table if not exists public.season_xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.platform_users (id) on delete cascade,
  season_id uuid not null references public.seasons (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  event_type text not null,
  event_key text not null,
  xp_amount integer not null check (xp_amount > 0),
  source text,
  created_at timestamptz not null default now(),
  constraint season_xp_events_event_key_key unique (event_key)
);

create index if not exists season_xp_events_user_season_idx
  on public.season_xp_events (user_id, season_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 7. 행동별 시즌 XP 규칙 (글로벌)
-- ---------------------------------------------------------------------------

create table if not exists public.season_xp_rules (
  event_type text primary key,
  display_name_ko text not null,
  xp_amount integer not null check (xp_amount > 0),
  is_active boolean not null default true
);

insert into public.season_xp_rules (event_type, display_name_ko, xp_amount)
values
  ('PT_ATTENDANCE', 'PT 출석', 50),
  ('GROUP_CLASS_ATTENDANCE', '그룹수업 출석', 40),
  ('WORKOUT_LOG', '운동일지 작성', 30),
  ('PHOTO_WORKOUT_LOG', '사진 운동일지', 35),
  ('BODY_COMPOSITION', '체성분 측정', 60),
  ('CHALLENGE_COMPLETE', '센터 챌린지 완료', 200),
  ('ACHIEVEMENT', '업적 달성', 75),
  ('STREAK_7_DAYS', '7일 연속 출석', 100),
  ('STREAK_30_DAYS', '30일 연속 출석', 300)
on conflict (event_type) do update
set
  display_name_ko = excluded.display_name_ko,
  xp_amount = excluded.xp_amount,
  is_active = true;

alter table public.seasons enable row level security;
alter table public.season_rewards enable row level security;
alter table public.user_season_progress enable row level security;
alter table public.user_season_reward_claims enable row level security;
alter table public.season_xp_events enable row level security;
alter table public.season_xp_rules enable row level security;

drop policy if exists "seasons_all" on public.seasons;
create policy "seasons_all" on public.seasons for all using (true) with check (true);

drop policy if exists "season_rewards_all" on public.season_rewards;
create policy "season_rewards_all" on public.season_rewards for all using (true) with check (true);

drop policy if exists "user_season_progress_all" on public.user_season_progress;
create policy "user_season_progress_all" on public.user_season_progress for all using (true) with check (true);

drop policy if exists "user_season_reward_claims_all" on public.user_season_reward_claims;
create policy "user_season_reward_claims_all" on public.user_season_reward_claims for all using (true) with check (true);

drop policy if exists "season_xp_events_all" on public.season_xp_events;
create policy "season_xp_events_all" on public.season_xp_events for all using (true) with check (true);

drop policy if exists "season_xp_rules_read" on public.season_xp_rules;
create policy "season_xp_rules_read" on public.season_xp_rules for select using (true);

-- ---------------------------------------------------------------------------
-- 8. 시즌 레벨 계산
-- ---------------------------------------------------------------------------

create or replace function public.compute_season_level(
  p_season_id uuid,
  p_season_xp integer
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_level integer := 0;
begin
  select coalesce(max(sr.level), 0) into v_level
  from public.season_rewards sr
  where sr.season_id = p_season_id
    and sr.xp_required <= p_season_xp;

  return coalesce(v_level, 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. 활성 시즌 조회
-- ---------------------------------------------------------------------------

create or replace function public.get_active_season_for_center(p_center_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_season_id uuid;
  v_today date := (timezone('Asia/Seoul', now()))::date;
begin
  select s.id into v_season_id
  from public.seasons s
  where s.center_id = p_center_id
    and s.is_active
    and v_today >= s.start_date
    and v_today <= s.end_date
  order by s.start_date desc, s.created_at desc
  limit 1;

  return v_season_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. 기본 보상 시드 (LV1~20)
-- ---------------------------------------------------------------------------

create or replace function public.seed_season_default_rewards(p_season_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flower_bed uuid;
  v_rare_tree uuid;
  v_fountain uuid;
  v_stone_path uuid;
  v_flower uuid;
  v_bench uuid;
  v_lamp uuid;
  v_pond uuid;
begin
  select id into v_flower_bed from public.garden_shop_items where sprite_key = 'flower_bed';
  select id into v_rare_tree from public.garden_shop_items where sprite_key = 'rare_tree';
  select id into v_fountain from public.garden_shop_items where sprite_key = 'season_fountain';
  select id into v_stone_path from public.garden_shop_items where sprite_key = 'stone_path';
  select id into v_flower from public.garden_shop_items where sprite_key = 'flower';
  select id into v_bench from public.garden_shop_items where sprite_key = 'bench';
  select id into v_lamp from public.garden_shop_items where sprite_key = 'street_lamp';
  select id into v_pond from public.garden_shop_items where sprite_key = 'pond';

  delete from public.season_rewards where season_id = p_season_id;

  insert into public.season_rewards (
    season_id, level, xp_required, reward_type, reward_acorns,
    garden_shop_item_id, title, description, icon, sprite_key, sort_order
  )
  values
    (p_season_id, 1, 120, 'acorns', 10, null, 'LV1 보상', '도토리 10개', '🌰', null, 1),
    (p_season_id, 2, 240, 'acorns', 15, null, 'LV2 보상', '도토리 15개', '🌰', null, 2),
    (p_season_id, 3, 360, 'acorns', 20, null, 'LV3 보상', '도토리 20개', '🌰', null, 3),
    (p_season_id, 4, 480, 'garden_item', 0, v_stone_path, 'LV4 보상', '돌길 1개', '🪨', 'stone_path', 4),
    (p_season_id, 5, 600, 'limited_item', 0, v_flower_bed, 'LV5 보상', '꽃밭', '🌸', 'flower_bed', 5),
    (p_season_id, 6, 720, 'acorns', 25, null, 'LV6 보상', '도토리 25개', '🌰', null, 6),
    (p_season_id, 7, 840, 'garden_item', 0, v_flower, 'LV7 보상', '꽃 1개', '🌷', 'flower', 7),
    (p_season_id, 8, 960, 'acorns', 30, null, 'LV8 보상', '도토리 30개', '🌰', null, 8),
    (p_season_id, 9, 1080, 'garden_item', 0, v_bench, 'LV9 보상', '벤치 1개', '🪑', 'bench', 9),
    (p_season_id, 10, 1200, 'limited_item', 0, v_rare_tree, 'LV10 보상', '희귀 나무', '🌳', 'rare_tree', 10),
    (p_season_id, 11, 1320, 'acorns', 35, null, 'LV11 보상', '도토리 35개', '🌰', null, 11),
    (p_season_id, 12, 1440, 'acorns', 40, null, 'LV12 보상', '도토리 40개', '🌰', null, 12),
    (p_season_id, 13, 1560, 'garden_item', 0, v_lamp, 'LV13 보상', '가로등 1개', '💡', 'street_lamp', 13),
    (p_season_id, 14, 1680, 'acorns', 45, null, 'LV14 보상', '도토리 45개', '🌰', null, 14),
    (p_season_id, 15, 1800, 'garden_item', 0, v_pond, 'LV15 보상', '작은 연못 1개', '🫧', 'pond', 15),
    (p_season_id, 16, 1920, 'acorns', 50, null, 'LV16 보상', '도토리 50개', '🌰', null, 16),
    (p_season_id, 17, 2040, 'acorns', 55, null, 'LV17 보상', '도토리 55개', '🌰', null, 17),
    (p_season_id, 18, 2160, 'acorns', 60, null, 'LV18 보상', '도토리 60개', '🌰', null, 18),
    (p_season_id, 19, 2280, 'acorns', 70, null, 'LV19 보상', '도토리 70개', '🌰', null, 19),
    (p_season_id, 20, 2400, 'limited_item', 0, v_fountain, 'LV20 보상', '시즌 한정 분수', '⛲', 'season_fountain', 20);
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. 시즌 XP 적립
-- ---------------------------------------------------------------------------

create or replace function public.earn_season_xp(
  p_user_id uuid,
  p_member_id uuid,
  p_event_type text,
  p_event_key text,
  p_source text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_center_id uuid;
  v_season_id uuid;
  v_rule public.season_xp_rules%rowtype;
  v_xp integer := 0;
  v_key text := nullif(trim(coalesce(p_event_key, '')), '');
  v_season_key text;
  v_progress public.user_season_progress%rowtype;
  v_new_level integer := 0;
begin
  if p_user_id is null or v_key is null then
    return jsonb_build_object('ok', false, 'earned', 0);
  end if;

  if p_member_id is not null then
    select m.center_id into v_center_id from public.members m where m.id = p_member_id;
  end if;

  if v_center_id is null then
    return jsonb_build_object('ok', false, 'earned', 0);
  end if;

  v_season_id := public.get_active_season_for_center(v_center_id);
  if v_season_id is null then
    return jsonb_build_object('ok', false, 'earned', 0, 'reason', 'no_active_season');
  end if;

  select * into v_rule
  from public.season_xp_rules
  where event_type = upper(trim(p_event_type))
    and is_active;

  if not found then
    return jsonb_build_object('ok', false, 'earned', 0);
  end if;

  v_xp := v_rule.xp_amount;
  v_season_key := 'season_xp:' || v_season_id::text || ':' || v_key;

  if exists (select 1 from public.season_xp_events where event_key = v_season_key) then
    return jsonb_build_object('ok', true, 'duplicate', true, 'earned', 0);
  end if;

  insert into public.season_xp_events (
    user_id, season_id, member_id, event_type, event_key, xp_amount, source
  )
  values (
    p_user_id, v_season_id, p_member_id, v_rule.event_type, v_season_key, v_xp, p_source
  );

  insert into public.user_season_progress (user_id, season_id, season_xp, current_level)
  values (p_user_id, v_season_id, v_xp, 0)
  on conflict (user_id, season_id) do update
  set
    season_xp = public.user_season_progress.season_xp + excluded.season_xp,
    updated_at = now();

  select * into v_progress
  from public.user_season_progress
  where user_id = p_user_id and season_id = v_season_id;

  v_new_level := public.compute_season_level(v_season_id, v_progress.season_xp);

  update public.user_season_progress
  set current_level = v_new_level, updated_at = now()
  where id = v_progress.id;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'earned', v_xp,
    'season_id', v_season_id,
    'season_xp', v_progress.season_xp + v_xp,
    'current_level', v_new_level
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 12. 보상 수령
-- ---------------------------------------------------------------------------

create or replace function public.grant_season_garden_item(
  p_user_id uuid,
  p_shop_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_shop_item_id is null then
    return;
  end if;

  insert into public.user_garden_inventory (user_id, shop_item_id, quantity)
  values (p_user_id, p_shop_item_id, 1)
  on conflict (user_id, shop_item_id) do update
  set
    quantity = public.user_garden_inventory.quantity + 1,
    updated_at = now();
end;
$$;

create or replace function public.claim_season_reward(
  p_member_id uuid,
  p_season_reward_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_reward public.season_rewards%rowtype;
  v_progress public.user_season_progress%rowtype;
  v_grant_sprite uuid;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);

  select * into v_reward
  from public.season_rewards
  where id = p_season_reward_id;

  if not found then
    raise exception 'SEASON_REWARD_NOT_FOUND';
  end if;

  select * into v_progress
  from public.user_season_progress
  where user_id = v_user_id and season_id = v_reward.season_id;

  if not found or v_progress.season_xp < v_reward.xp_required then
    raise exception 'SEASON_LEVEL_NOT_REACHED';
  end if;

  if exists (
    select 1 from public.user_season_reward_claims
    where user_id = v_user_id and season_reward_id = p_season_reward_id
  ) then
    raise exception 'SEASON_REWARD_ALREADY_CLAIMED';
  end if;

  insert into public.user_season_reward_claims (
    user_id, season_id, season_reward_id
  )
  values (v_user_id, v_reward.season_id, p_season_reward_id);

  if v_reward.reward_type = 'acorns' and v_reward.reward_acorns > 0 then
    insert into public.user_growth_balances (user_id)
    values (v_user_id) on conflict (user_id) do nothing;

    update public.user_growth_balances
    set current_acorns = current_acorns + v_reward.reward_acorns, updated_at = now()
    where user_id = v_user_id;

    insert into public.acorn_transactions (user_id, amount, type, reason, event_key)
    values (
      v_user_id,
      v_reward.reward_acorns,
      'earn',
      'SEASON_PASS',
      'season_reward:' || p_season_reward_id::text
    );
  elsif v_reward.reward_type in ('garden_item', 'limited_item') then
    if v_reward.garden_shop_item_id is not null then
      perform public.grant_season_garden_item(v_user_id, v_reward.garden_shop_item_id);
    elsif v_reward.sprite_key is not null then
      select id into v_grant_sprite
      from public.garden_shop_items
      where sprite_key = v_reward.sprite_key
      limit 1;
      perform public.grant_season_garden_item(v_user_id, v_grant_sprite);
    end if;
  end if;

  return public.get_season_pass_state(p_member_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 13. 시즌 패스 상태 조회
-- ---------------------------------------------------------------------------

create or replace function public.get_season_pass_state(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_center_id uuid;
  v_season public.seasons%rowtype;
  v_progress public.user_season_progress%rowtype;
  v_rewards jsonb;
  v_rules jsonb;
  v_today date := (timezone('Asia/Seoul', now()))::date;
  v_next_reward jsonb;
  v_current_level integer := 0;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);

  select m.center_id into v_center_id
  from public.members m where m.id = p_member_id;

  select * into v_season
  from public.seasons s
  where s.center_id = v_center_id
    and s.is_active
    and v_today >= s.start_date
    and v_today <= s.end_date
  order by s.start_date desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', true,
      'has_active_season', false,
      'member_id', p_member_id
    );
  end if;

  insert into public.user_season_progress (user_id, season_id)
  values (v_user_id, v_season.id)
  on conflict (user_id, season_id) do nothing;

  select * into v_progress
  from public.user_season_progress
  where user_id = v_user_id and season_id = v_season.id;

  v_current_level := public.compute_season_level(v_season.id, coalesce(v_progress.season_xp, 0));

  update public.user_season_progress
  set current_level = v_current_level, updated_at = now()
  where id = v_progress.id;

  select coalesce(jsonb_agg(row_to_json(r) order by r.level), '[]'::jsonb)
  into v_rewards
  from (
    select
      sr.id,
      sr.level,
      sr.xp_required,
      sr.reward_type,
      sr.reward_acorns,
      sr.garden_shop_item_id,
      sr.title,
      sr.description,
      sr.icon,
      sr.sprite_key,
      (coalesce(v_progress.season_xp, 0) >= sr.xp_required) as is_unlocked,
      exists (
        select 1 from public.user_season_reward_claims c
        where c.user_id = v_user_id and c.season_reward_id = sr.id
      ) as is_claimed
    from public.season_rewards sr
    where sr.season_id = v_season.id
    order by sr.level
  ) r;

  select row_to_json(nr) into v_next_reward
  from (
    select sr.id, sr.level, sr.xp_required, sr.title, sr.description, sr.icon
    from public.season_rewards sr
    where sr.season_id = v_season.id
      and sr.xp_required > coalesce(v_progress.season_xp, 0)
    order by sr.level
    limit 1
  ) nr;

  select coalesce(jsonb_agg(row_to_json(x) order by x.event_type), '[]'::jsonb)
  into v_rules
  from (
    select event_type, display_name_ko, xp_amount
    from public.season_xp_rules where is_active order by event_type
  ) x;

  return jsonb_build_object(
    'ok', true,
    'has_active_season', true,
    'member_id', p_member_id,
    'user_id', v_user_id,
    'season', jsonb_build_object(
      'id', v_season.id,
      'title', v_season.title,
      'description', v_season.description,
      'start_date', v_season.start_date,
      'end_date', v_season.end_date,
      'max_level', v_season.max_level
    ),
    'progress', jsonb_build_object(
      'season_xp', coalesce(v_progress.season_xp, 0),
      'current_level', v_current_level,
      'next_reward', v_next_reward
    ),
    'rewards', v_rewards,
    'xp_rules', v_rules
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 14. post_growth_event — 시즌 XP 연동
-- ---------------------------------------------------------------------------

create or replace function public.post_growth_event(
  p_user_id uuid,
  p_event_type text,
  p_event_key text default null,
  p_source text default null,
  p_member_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_type text;
  v_rule public.growth_reward_rules%rowtype;
  v_growth_amount integer := 0;
  v_acorn_amount integer := 0;
  v_event_key text := nullif(trim(coalesce(p_event_key, '')), '');
  v_period_count integer := 0;
  v_balance public.user_growth_balances%rowtype;
  v_total_before integer := 0;
  v_tree jsonb;
  v_feed_id uuid;
  v_achievements jsonb;
  v_challenges jsonb;
  v_season_xp jsonb;
begin
  if p_user_id is null then raise exception 'USER_ID_REQUIRED'; end if;
  if v_event_key is null then raise exception 'EVENT_KEY_REQUIRED'; end if;

  v_event_type := upper(trim(coalesce(p_event_type, '')));
  if v_event_type = 'CHALLENGE' then v_event_type := 'CHALLENGE_COMPLETE'; end if;
  if v_event_type = 'MANUAL' then raise exception 'MANUAL_REQUIRES_AMOUNTS'; end if;

  select * into v_rule from public.growth_reward_rules where event_type = v_event_type and is_active;
  if not found then raise exception 'UNKNOWN_EVENT_TYPE'; end if;

  v_growth_amount := v_rule.growth_reward;
  v_acorn_amount := v_rule.acorn_reward;
  if v_growth_amount <= 0 and v_acorn_amount <= 0 then raise exception 'INACTIVE_REWARD_RULE'; end if;

  if exists (select 1 from public.growth_events ge where ge.event_key = v_event_key) then
    select * into v_balance from public.user_growth_balances where user_id = p_user_id;
    return jsonb_build_object(
      'ok', true, 'duplicate', true, 'user_id', p_user_id, 'event_key', v_event_key,
      'total_growth', coalesce(v_balance.total_growth, 0),
      'current_acorns', coalesce(v_balance.current_acorns, 0),
      'tree', public.compute_growth_tree_stage(coalesce(v_balance.total_growth, 0))
    );
  end if;

  if v_rule.limit_period = 'monthly' and coalesce(v_rule.limit_count, 0) > 0 then
    select count(*)::integer into v_period_count from public.growth_events ge
    where ge.user_id = p_user_id and ge.event_type = v_event_type
      and ge.created_at >= date_trunc('month', timezone('Asia/Seoul', now()) at time zone 'Asia/Seoul');
    if v_period_count >= v_rule.limit_count then
      select * into v_balance from public.user_growth_balances where user_id = p_user_id;
      return jsonb_build_object('ok', true, 'duplicate', true, 'limit_reached', true,
        'user_id', p_user_id, 'total_growth', coalesce(v_balance.total_growth, 0),
        'current_acorns', coalesce(v_balance.current_acorns, 0),
        'tree', public.compute_growth_tree_stage(coalesce(v_balance.total_growth, 0)));
    end if;
  end if;

  if v_rule.limit_period = 'rolling_30d' and coalesce(v_rule.limit_count, 0) > 0 then
    select count(*)::integer into v_period_count from public.growth_events ge
    where ge.user_id = p_user_id and ge.event_type = v_event_type
      and ge.created_at >= now() - interval '30 days';
    if v_period_count >= v_rule.limit_count then
      select * into v_balance from public.user_growth_balances where user_id = p_user_id;
      return jsonb_build_object('ok', true, 'duplicate', true, 'limit_reached', true,
        'user_id', p_user_id, 'total_growth', coalesce(v_balance.total_growth, 0),
        'current_acorns', coalesce(v_balance.current_acorns, 0),
        'tree', public.compute_growth_tree_stage(coalesce(v_balance.total_growth, 0)));
    end if;
  end if;

  insert into public.user_growth_balances (user_id) values (p_user_id) on conflict (user_id) do nothing;
  select coalesce(total_growth, 0) into v_total_before from public.user_growth_balances where user_id = p_user_id;

  insert into public.growth_events (user_id, member_id, event_type, event_key, title_ko, growth_amount, acorn_amount, source)
  values (p_user_id, p_member_id, v_event_type, v_event_key, v_rule.display_name_ko, v_growth_amount, v_acorn_amount, p_source)
  returning id into v_feed_id;

  insert into public.growth_transactions (user_id, event_type, amount, source, event_key)
  values (p_user_id, v_event_type, v_growth_amount, p_source, v_event_key);

  if v_acorn_amount > 0 then
    insert into public.acorn_transactions (user_id, amount, type, reason, event_key)
    values (p_user_id, v_acorn_amount, 'earn', v_event_type, v_event_key || ':acorn');
  end if;

  update public.user_growth_balances
  set total_growth = total_growth + v_growth_amount, current_acorns = current_acorns + v_acorn_amount, updated_at = now()
  where user_id = p_user_id returning * into v_balance;

  perform public.notify_growth_tree_stage_if_needed(p_user_id, p_member_id, v_total_before, v_balance.total_growth);
  v_achievements := public.evaluate_growth_achievements(p_user_id, p_member_id);

  if p_member_id is not null then
    v_challenges := public.sync_center_challenges_for_member(p_member_id, p_user_id);
    v_season_xp := public.earn_season_xp(p_user_id, p_member_id, v_event_type, v_event_key, p_source);
  else
    v_challenges := '[]'::jsonb;
    v_season_xp := '{}'::jsonb;
  end if;

  select * into v_balance from public.user_growth_balances where user_id = p_user_id;
  v_tree := public.compute_growth_tree_stage(v_balance.total_growth);

  return jsonb_build_object(
    'ok', true, 'duplicate', false, 'user_id', p_user_id, 'member_id', p_member_id,
    'event_type', v_event_type, 'event_key', v_event_key, 'feed_id', v_feed_id,
    'title_ko', v_rule.display_name_ko, 'growth_awarded', v_growth_amount, 'acorns_awarded', v_acorn_amount,
    'total_growth', v_balance.total_growth, 'current_acorns', v_balance.current_acorns, 'tree', v_tree,
    'achievements_unlocked', v_achievements -> 'unlocked',
    'challenges_completed', v_challenges -> 'completed',
    'season_xp', v_season_xp
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 15. 업적 달성 시 시즌 XP
-- ---------------------------------------------------------------------------

create or replace function public.evaluate_growth_achievements(
  p_user_id uuid,
  p_member_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_achievement public.growth_achievements%rowtype;
  v_metric integer;
  v_newly_unlocked jsonb := '[]'::jsonb;
  v_ref_key text;
begin
  for v_achievement in
    select * from public.growth_achievements ga
    where ga.is_active order by ga.sort_order, ga.target_value
  loop
    if exists (
      select 1 from public.user_growth_achievements uga
      where uga.user_id = p_user_id and uga.achievement_code = v_achievement.code
    ) then continue; end if;

    v_metric := public.compute_growth_achievement_metric(p_user_id, v_achievement.metric_type);
    if v_metric < v_achievement.target_value then continue; end if;

    insert into public.user_growth_achievements (user_id, achievement_id, achievement_code)
    values (p_user_id, v_achievement.id, v_achievement.code);

    if v_achievement.reward_growth > 0 or v_achievement.reward_acorn > 0 then
      insert into public.user_growth_balances (user_id) values (p_user_id) on conflict (user_id) do nothing;
      update public.user_growth_balances
      set total_growth = total_growth + v_achievement.reward_growth,
          current_acorns = current_acorns + v_achievement.reward_acorn, updated_at = now()
      where user_id = p_user_id;

      if v_achievement.reward_growth > 0 then
        insert into public.growth_transactions (user_id, event_type, amount, source, event_key)
        values (p_user_id, 'ACHIEVEMENT', v_achievement.reward_growth, 'achievement', 'achievement:' || v_achievement.code)
        on conflict do nothing;
      end if;
      if v_achievement.reward_acorn > 0 then
        insert into public.acorn_transactions (user_id, amount, type, reason, event_key)
        values (p_user_id, v_achievement.reward_acorn, 'earn', 'ACHIEVEMENT', 'achievement:' || v_achievement.code || ':acorn');
      end if;
    end if;

    v_ref_key := 'achievement:' || v_achievement.code || ':' || p_user_id::text;
    insert into public.growth_notifications (user_id, member_id, notification_type, title, body, icon, growth_amount, acorn_amount, reference_key)
    values (p_user_id, p_member_id, 'achievement', '🎉 업적 달성', v_achievement.title, v_achievement.icon,
      v_achievement.reward_growth, v_achievement.reward_acorn, v_ref_key)
    on conflict (reference_key) do nothing;

    if p_member_id is not null then
      perform public.earn_season_xp(
        p_user_id, p_member_id, 'ACHIEVEMENT',
        'achievement:' || v_achievement.code, 'achievement'
      );
    end if;

    v_newly_unlocked := v_newly_unlocked || jsonb_build_array(jsonb_build_object(
      'code', v_achievement.code, 'title', v_achievement.title
    ));
  end loop;

  return jsonb_build_object('unlocked', v_newly_unlocked);
end;
$$;

-- ---------------------------------------------------------------------------
-- 16. 정원 상점 — 시즌 전용 아이템 숨김
-- ---------------------------------------------------------------------------

create or replace function public.get_garden_state(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_garden public.gardens%rowtype;
  v_balance integer := 0;
  v_tree jsonb;
  v_shop jsonb;
  v_inventory jsonb;
  v_placed jsonb;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);
  perform public.ensure_garden_for_user(v_user_id);

  select * into v_garden from public.gardens where user_id = v_user_id;

  select coalesce(ugb.current_acorns, 0) into v_balance
  from public.user_growth_balances ugb where ugb.user_id = v_user_id;
  if not found then
    insert into public.user_growth_balances (user_id) values (v_user_id) on conflict (user_id) do nothing;
    v_balance := 0;
  end if;

  select public.compute_growth_tree_stage(
    coalesce((select total_growth from public.user_growth_balances where user_id = v_user_id), 0)
  ) into v_tree;

  select coalesce(jsonb_agg(row_to_json(s) order by s.sort_order), '[]'::jsonb) into v_shop
  from (
    select id, item_name, item_type, cost_acorns, sprite_key, sort_order
    from public.garden_shop_items
    where is_active and is_shop_visible
    order by sort_order
  ) s;

  select coalesce(jsonb_agg(row_to_json(i) order by i.item_name), '[]'::jsonb) into v_inventory
  from (
    select ugi.id, ugi.shop_item_id, gsi.item_name, gsi.item_type, gsi.sprite_key, ugi.quantity
    from public.user_garden_inventory ugi
    inner join public.garden_shop_items gsi on gsi.id = ugi.shop_item_id
    where ugi.user_id = v_user_id and ugi.quantity > 0
    order by gsi.sort_order
  ) i;

  select coalesce(jsonb_agg(row_to_json(p) order by p.y, p.x), '[]'::jsonb) into v_placed
  from (
    select gi.id, gi.shop_item_id, gsi.item_name, gsi.item_type, gsi.sprite_key, gi.x, gi.y, gi.placed_at
    from public.garden_items gi
    inner join public.garden_shop_items gsi on gsi.id = gi.shop_item_id
    where gi.garden_id = v_garden.id
    order by gi.y, gi.x
  ) p;

  return jsonb_build_object(
    'ok', true, 'user_id', v_user_id, 'member_id', p_member_id,
    'garden', jsonb_build_object('id', v_garden.id, 'width', v_garden.width, 'height', v_garden.height,
      'tree_x', v_garden.tree_x, 'tree_y', v_garden.tree_y),
    'current_acorns', v_balance,
    'tree_stage_key', v_tree ->> 'current_stage_key',
    'tree_stage_name', v_tree ->> 'current_stage_name',
    'shop_items', v_shop, 'inventory', v_inventory, 'placed_items', v_placed
  );
end;
$$;

grant execute on function public.compute_season_level(uuid, integer) to anon, authenticated, service_role;
grant execute on function public.get_active_season_for_center(uuid) to anon, authenticated, service_role;
grant execute on function public.seed_season_default_rewards(uuid) to anon, authenticated, service_role;
grant execute on function public.earn_season_xp(uuid, uuid, text, text, text) to anon, authenticated, service_role;
grant execute on function public.grant_season_garden_item(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.claim_season_reward(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.get_season_pass_state(uuid) to anon, authenticated, service_role;
grant execute on function public.post_growth_event(uuid, text, text, text, uuid) to anon, authenticated, service_role;
grant execute on function public.evaluate_growth_achievements(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.get_garden_state(uuid) to anon, authenticated, service_role;
