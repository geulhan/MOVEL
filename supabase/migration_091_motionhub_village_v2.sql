-- MotionHub Village v2: 운동나무 중심 · 고정 건물 슬롯 · 건설/업그레이드
-- migration_090 이후 실행
-- 기존 8×8 자유 배치·정원식 상점 흐름 폐기

-- ---------------------------------------------------------------------------
-- 1. 카탈로그 확장
-- ---------------------------------------------------------------------------

alter table public.slg_building_catalog
  add column if not exists unlock_stage_key text,
  add column if not exists slot_key text,
  add column if not exists grid_x integer,
  add column if not exists grid_y integer,
  add column if not exists build_cost_acorns integer,
  add column if not exists upgrade_cost_acorns integer,
  add column if not exists max_level integer not null default 3;

-- 구(舊) 자유 배치 건물 비활성화
update public.slg_building_catalog
set is_active = false
where slot_key is null;

delete from public.slg_village_buildings;
delete from public.slg_village_inventory;

update public.slg_member_villages
set width = 5, height = 5, plaza_x = 2, plaza_y = 2;

insert into public.slg_building_catalog (
  code,
  title,
  description,
  tier,
  cost_acorns,
  min_growth,
  sprite_key,
  sort_order,
  unlock_stage_key,
  slot_key,
  grid_x,
  grid_y,
  build_cost_acorns,
  upgrade_cost_acorns,
  max_level,
  is_active
)
values
  (
    'warehouse',
    '창고',
    '운동 기록과 보상을 모아두는 마을 창고입니다.',
    1,
    40,
    0,
    'slg_warehouse',
    1,
    'sprout',
    'north',
    2,
    1,
    40,
    25,
    3,
    true
  ),
  (
    'bench',
    '벤치',
    '휴식과 만남의 공간. 마을이 조금씩 살아납니다.',
    2,
    60,
    0,
    'slg_bench',
    2,
    'small',
    'west',
    1,
    2,
    60,
    35,
    3,
    true
  ),
  (
    'plaza',
    '광장',
    '회원들이 모이는 중심 광장입니다.',
    3,
    100,
    0,
    'slg_plaza',
    3,
    'large',
    'east',
    3,
    2,
    100,
    50,
    3,
    true
  ),
  (
    'fountain',
    '분수',
    '성장의 결실을 보여주는 마을 랜드마크입니다.',
    4,
    150,
    0,
    'slg_fountain',
    4,
    'sakura',
    'south',
    2,
    3,
    150,
    75,
    3,
    true
  )
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  tier = excluded.tier,
  cost_acorns = excluded.build_cost_acorns,
  min_growth = 0,
  sprite_key = excluded.sprite_key,
  sort_order = excluded.sort_order,
  unlock_stage_key = excluded.unlock_stage_key,
  slot_key = excluded.slot_key,
  grid_x = excluded.grid_x,
  grid_y = excluded.grid_y,
  build_cost_acorns = excluded.build_cost_acorns,
  upgrade_cost_acorns = excluded.upgrade_cost_acorns,
  max_level = excluded.max_level,
  is_active = true;

create unique index if not exists slg_building_catalog_slot_key_active_idx
  on public.slg_building_catalog (slot_key)
  where is_active and slot_key is not null;

-- ---------------------------------------------------------------------------
-- 2. 슬롯 건물 (고정 위치)
-- ---------------------------------------------------------------------------

create table if not exists public.slg_village_slot_buildings (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references public.slg_member_villages (id) on delete cascade,
  slot_key text not null,
  building_id uuid not null references public.slg_building_catalog (id) on delete restrict,
  level integer not null default 1 check (level >= 1 and level <= 10),
  built_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slg_village_slot_buildings_slot_key unique (village_id, slot_key)
);

create index if not exists slg_village_slot_buildings_village_idx
  on public.slg_village_slot_buildings (village_id);

alter table public.slg_village_slot_buildings enable row level security;

drop policy if exists "slg_village_slot_buildings_all" on public.slg_village_slot_buildings;
create policy "slg_village_slot_buildings_all" on public.slg_village_slot_buildings
  for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 3. 헬퍼
-- ---------------------------------------------------------------------------

create or replace function public.growth_stage_rank(p_stage_key text)
returns integer
language sql
immutable
as $$
  select case coalesce(p_stage_key, 'none')
    when 'none' then 0
    when 'seed' then 1
    when 'sprout' then 2
    when 'small' then 3
    when 'large' then 4
    when 'sakura' then 5
    else 0
  end;
$$;

create or replace function public.ensure_slg_village_for_user(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.slg_member_villages where user_id = p_user_id;
  if found then
    update public.slg_member_villages
    set width = 5, height = 5, plaza_x = 2, plaza_y = 2
    where id = v_id;
    return v_id;
  end if;

  insert into public.slg_member_villages (user_id, width, height, plaza_x, plaza_y)
  values (p_user_id, 5, 5, 2, 2)
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. 마을 상태 조회
-- ---------------------------------------------------------------------------

create or replace function public.get_slg_village_state(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_village public.slg_member_villages%rowtype;
  v_acorns integer := 0;
  v_growth integer := 0;
  v_tree jsonb;
  v_stage_key text;
  v_stage_rank integer := 0;
  v_catalog jsonb;
  v_slots jsonb;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);
  perform public.ensure_slg_village_for_user(v_user_id);

  select * into v_village from public.slg_member_villages where user_id = v_user_id;

  select coalesce(ugb.current_acorns, 0), coalesce(ugb.total_growth, 0)
  into v_acorns, v_growth
  from public.user_growth_balances ugb
  where ugb.user_id = v_user_id;

  if not found then
    insert into public.user_growth_balances (user_id) values (v_user_id)
    on conflict (user_id) do nothing;
    v_acorns := 0;
    v_growth := 0;
  end if;

  v_tree := public.compute_growth_tree_stage(v_growth);
  v_stage_key := coalesce(v_tree ->> 'current_stage_key', 'seed');
  v_stage_rank := public.growth_stage_rank(v_stage_key);

  select coalesce(jsonb_agg(row_to_json(c) order by c.sort_order), '[]'::jsonb)
  into v_catalog
  from (
    select
      id,
      code,
      title,
      description,
      tier,
      coalesce(build_cost_acorns, cost_acorns) as build_cost_acorns,
      coalesce(upgrade_cost_acorns, 0) as upgrade_cost_acorns,
      max_level,
      sprite_key,
      sort_order,
      unlock_stage_key,
      slot_key,
      grid_x,
      grid_y,
      (v_stage_rank >= public.growth_stage_rank(unlock_stage_key)) as is_unlocked
    from public.slg_building_catalog
    where is_active and slot_key is not null
    order by sort_order
  ) c;

  select coalesce(jsonb_agg(row_to_json(s) order by s.sort_order), '[]'::jsonb)
  into v_slots
  from (
    select
      sbc.slot_key,
      sbc.grid_x,
      sbc.grid_y,
      sbc.sort_order,
      sbc.id as building_id,
      sbc.code,
      sbc.title,
      sbc.description,
      sbc.sprite_key,
      sbc.tier,
      coalesce(sbc.build_cost_acorns, sbc.cost_acorns) as build_cost_acorns,
      coalesce(sbc.upgrade_cost_acorns, 0) as upgrade_cost_acorns,
      sbc.max_level,
      sbc.unlock_stage_key,
      (v_stage_rank >= public.growth_stage_rank(sbc.unlock_stage_key)) as is_unlocked,
      ssb.id as slot_building_id,
      coalesce(ssb.level, 0) as level,
      ssb.built_at,
      (ssb.id is not null) as is_built,
      case
        when ssb.id is null then null
        when ssb.level >= sbc.max_level then null
        else coalesce(sbc.upgrade_cost_acorns, 0) * ssb.level
      end as next_upgrade_cost,
      case
        when ssb.id is null then coalesce(sbc.build_cost_acorns, sbc.cost_acorns)
        else null
      end as build_cost_now
    from public.slg_building_catalog sbc
    left join public.slg_village_slot_buildings ssb
      on ssb.village_id = v_village.id and ssb.slot_key = sbc.slot_key
    where sbc.is_active and sbc.slot_key is not null
    order by sbc.sort_order
  ) s;

  return jsonb_build_object(
    'ok', true,
    'user_id', v_user_id,
    'member_id', p_member_id,
    'village', jsonb_build_object(
      'id', v_village.id,
      'width', v_village.width,
      'height', v_village.height,
      'plaza_x', v_village.plaza_x,
      'plaza_y', v_village.plaza_y
    ),
    'current_acorns', v_acorns,
    'total_growth', v_growth,
    'tree_stage_key', v_stage_key,
    'tree_stage_name', v_tree ->> 'current_stage_name',
    'tree_stage_rank', v_stage_rank,
    'catalog', v_catalog,
    'slots', v_slots
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. 슬롯 건설
-- ---------------------------------------------------------------------------

create or replace function public.build_slg_village_slot(
  p_member_id uuid,
  p_slot_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_village public.slg_member_villages%rowtype;
  v_item public.slg_building_catalog%rowtype;
  v_tree jsonb;
  v_stage_rank integer;
  v_acorns integer := 0;
  v_cost integer;
  v_event_key text;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);
  perform public.ensure_slg_village_for_user(v_user_id);

  select * into v_village from public.slg_member_villages where user_id = v_user_id;

  select * into v_item from public.slg_building_catalog
  where slot_key = p_slot_key and is_active;
  if not found then raise exception 'SLG_SLOT_NOT_FOUND'; end if;

  if exists (
    select 1 from public.slg_village_slot_buildings
    where village_id = v_village.id and slot_key = p_slot_key
  ) then
    raise exception 'SLG_SLOT_ALREADY_BUILT';
  end if;

  select public.compute_growth_tree_stage(coalesce(total_growth, 0))
  into v_tree
  from public.user_growth_balances
  where user_id = v_user_id;

  v_stage_rank := public.growth_stage_rank(v_tree ->> 'current_stage_key');
  if v_stage_rank < public.growth_stage_rank(v_item.unlock_stage_key) then
    raise exception 'SLG_STAGE_REQUIRED';
  end if;

  v_cost := coalesce(v_item.build_cost_acorns, v_item.cost_acorns);

  select coalesce(current_acorns, 0) into v_acorns
  from public.user_growth_balances where user_id = v_user_id for update;

  if v_acorns < v_cost then
    raise exception 'INSUFFICIENT_ACORNS';
  end if;

  v_event_key := 'slg_build:' || p_slot_key || ':' || gen_random_uuid()::text;

  update public.user_growth_balances
  set current_acorns = current_acorns - v_cost, updated_at = now()
  where user_id = v_user_id;

  insert into public.acorn_transactions (user_id, amount, type, reason, event_key)
  values (v_user_id, v_cost, 'spend', 'SLG_VILLAGE_BUILD', v_event_key);

  insert into public.slg_village_slot_buildings (village_id, slot_key, building_id, level)
  values (v_village.id, p_slot_key, v_item.id, 1);

  return public.get_slg_village_state(p_member_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. 슬롯 업그레이드
-- ---------------------------------------------------------------------------

create or replace function public.upgrade_slg_village_slot(
  p_member_id uuid,
  p_slot_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_village public.slg_member_villages%rowtype;
  v_row public.slg_village_slot_buildings%rowtype;
  v_item public.slg_building_catalog%rowtype;
  v_acorns integer := 0;
  v_cost integer;
  v_event_key text;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);
  select * into v_village from public.slg_member_villages where user_id = v_user_id;

  select * into v_row from public.slg_village_slot_buildings
  where village_id = v_village.id and slot_key = p_slot_key for update;
  if not found then raise exception 'SLG_SLOT_NOT_BUILT'; end if;

  select * into v_item from public.slg_building_catalog where id = v_row.building_id;
  if v_row.level >= v_item.max_level then
    raise exception 'SLG_MAX_LEVEL';
  end if;

  v_cost := coalesce(v_item.upgrade_cost_acorns, 0) * v_row.level;

  select coalesce(current_acorns, 0) into v_acorns
  from public.user_growth_balances where user_id = v_user_id for update;

  if v_acorns < v_cost then
    raise exception 'INSUFFICIENT_ACORNS';
  end if;

  v_event_key := 'slg_upgrade:' || p_slot_key || ':L' || (v_row.level + 1)::text || ':' || gen_random_uuid()::text;

  update public.user_growth_balances
  set current_acorns = current_acorns - v_cost, updated_at = now()
  where user_id = v_user_id;

  insert into public.acorn_transactions (user_id, amount, type, reason, event_key)
  values (v_user_id, v_cost, 'spend', 'SLG_VILLAGE_UPGRADE', v_event_key);

  update public.slg_village_slot_buildings
  set level = level + 1, updated_at = now()
  where id = v_row.id;

  return public.get_slg_village_state(p_member_id);
end;
$$;

grant execute on function public.growth_stage_rank(text) to anon, authenticated, service_role;
grant execute on function public.build_slg_village_slot(uuid, text) to anon, authenticated, service_role;
grant execute on function public.upgrade_slg_village_slot(uuid, text) to anon, authenticated, service_role;
