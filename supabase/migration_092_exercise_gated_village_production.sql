-- MotionHub Village: 운동 연동 마을 생산·수거 (방치 보조, 운동 필수)
-- migration_091 이후 실행
-- 핵심: growth_events(실제 운동) 없으면 생산 0. 운동 1회당 최대 3시간 생산 크레딧.

alter table public.slg_member_villages
  add column if not exists last_collected_at timestamptz not null default now();

alter table public.slg_building_catalog
  add column if not exists production_acorns_per_hour integer not null default 1;

update public.slg_building_catalog
set production_acorns_per_hour = greatest(tier, 1)
where slot_key is not null and is_active;

-- ---------------------------------------------------------------------------
-- 생산량 계산 (운동 이벤트로만 생산 시간 해금)
-- ---------------------------------------------------------------------------

create or replace function public.compute_slg_village_production(
  p_user_id uuid,
  p_village_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_collect timestamptz;
  v_hours_elapsed numeric;
  v_event_count integer := 0;
  v_allowed_hours numeric := 0;
  v_pending integer := 0;
  v_built_count integer := 0;
  v_hours_per_event constant numeric := 3;
  v_max_window_hours constant numeric := 24;
begin
  select coalesce(last_collected_at, now())
  into v_last_collect
  from public.slg_member_villages
  where id = p_village_id;

  v_hours_elapsed := extract(epoch from (now() - v_last_collect)) / 3600.0;
  v_hours_elapsed := least(greatest(v_hours_elapsed, 0), v_max_window_hours);

  select count(*)::integer
  into v_event_count
  from public.growth_events ge
  where ge.user_id = p_user_id
    and ge.created_at > v_last_collect
    and (coalesce(ge.growth_amount, 0) > 0 or coalesce(ge.acorn_amount, 0) > 0);

  if v_event_count > 0 then
    v_allowed_hours := least(v_hours_elapsed, v_event_count * v_hours_per_event);
  else
    v_allowed_hours := 0;
  end if;

  select count(*)::integer
  into v_built_count
  from public.slg_village_slot_buildings ssb
  where ssb.village_id = p_village_id;

  if v_built_count > 0 and v_allowed_hours > 0 then
    select coalesce(sum(
      greatest(coalesce(sbc.production_acorns_per_hour, sbc.tier, 1), 1)
      * ssb.level
      * v_allowed_hours
    ), 0)::integer
    into v_pending
    from public.slg_village_slot_buildings ssb
    join public.slg_building_catalog sbc on sbc.id = ssb.building_id
    where ssb.village_id = p_village_id;
  end if;

  return jsonb_build_object(
    'pending_acorns', greatest(v_pending, 0),
    'exercise_events_since_collect', v_event_count,
    'allowed_production_hours', round(v_allowed_hours::numeric, 1),
    'hours_elapsed', round(v_hours_elapsed::numeric, 1),
    'built_facility_count', v_built_count,
    'last_collected_at', v_last_collect
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 마을 상태 (생산 정보 포함)
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
  v_production jsonb;
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

  v_production := public.compute_slg_village_production(v_user_id, v_village.id);

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
      coalesce(production_acorns_per_hour, tier, 1) as production_acorns_per_hour,
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
      coalesce(sbc.production_acorns_per_hour, sbc.tier, 1) as production_acorns_per_hour,
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
      end as build_cost_now,
      case
        when ssb.id is null then null
        else greatest(coalesce(sbc.production_acorns_per_hour, sbc.tier, 1), 1) * ssb.level
      end as production_rate_per_hour
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
      'plaza_y', v_village.plaza_y,
      'last_collected_at', v_village.last_collected_at
    ),
    'current_acorns', v_acorns,
    'total_growth', v_growth,
    'tree_stage_key', v_stage_key,
    'tree_stage_name', v_tree ->> 'current_stage_name',
    'tree_stage_rank', v_stage_rank,
    'production', v_production,
    'catalog', v_catalog,
    'slots', v_slots
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 마을 생산 수거
-- ---------------------------------------------------------------------------

create or replace function public.collect_slg_village_production(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_village public.slg_member_villages%rowtype;
  v_production jsonb;
  v_pending integer := 0;
  v_event_key text;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);
  perform public.ensure_slg_village_for_user(v_user_id);

  select * into v_village from public.slg_member_villages where user_id = v_user_id for update;

  v_production := public.compute_slg_village_production(v_user_id, v_village.id);
  v_pending := coalesce((v_production ->> 'pending_acorns')::integer, 0);

  if v_pending <= 0 then
  return jsonb_build_object(
    'ok', true,
    'collected_acorns', 0,
    'state', public.get_slg_village_state(p_member_id)
  );
  end if;

  v_event_key := 'slg_collect:' || gen_random_uuid()::text;

  update public.user_growth_balances
  set current_acorns = current_acorns + v_pending, updated_at = now()
  where user_id = v_user_id;

  insert into public.acorn_transactions (user_id, amount, type, reason, event_key)
  values (v_user_id, v_pending, 'earn', 'SLG_VILLAGE_COLLECT', v_event_key);

  update public.slg_member_villages
  set last_collected_at = now()
  where id = v_village.id;

  return jsonb_build_object(
    'ok', true,
    'collected_acorns', v_pending,
    'state', public.get_slg_village_state(p_member_id)
  );
end;
$$;

grant execute on function public.compute_slg_village_production(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.collect_slg_village_production(uuid) to anon, authenticated, service_role;
