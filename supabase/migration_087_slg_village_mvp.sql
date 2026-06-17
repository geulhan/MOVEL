-- MotionHub 회원 SLG 마을 MVP (도토리 건설 · 성장치 해금)
-- migration_086 이후 실행
-- 기존 public.villages(센터 스텁)와 별도 스키마

-- ---------------------------------------------------------------------------
-- 1. 건물 카탈로그
-- ---------------------------------------------------------------------------

create table if not exists public.slg_building_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null default '',
  tier integer not null default 1 check (tier between 1 and 4),
  cost_acorns integer not null default 0 check (cost_acorns >= 0),
  min_growth integer not null default 0 check (min_growth >= 0),
  sprite_key text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. 회원 마을 (8x8)
-- ---------------------------------------------------------------------------

create table if not exists public.slg_member_villages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.platform_users (id) on delete cascade,
  width integer not null default 8 check (width > 0 and width <= 16),
  height integer not null default 8 check (height > 0 and height <= 16),
  plaza_x integer not null default 3 check (plaza_x >= 0),
  plaza_y integer not null default 3 check (plaza_y >= 0),
  created_at timestamptz not null default now(),
  constraint slg_member_villages_user_key unique (user_id)
);

-- ---------------------------------------------------------------------------
-- 3. 배치 건물
-- ---------------------------------------------------------------------------

create table if not exists public.slg_village_buildings (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references public.slg_member_villages (id) on delete cascade,
  building_id uuid not null references public.slg_building_catalog (id) on delete restrict,
  x integer not null check (x >= 0),
  y integer not null check (y >= 0),
  placed_at timestamptz not null default now(),
  constraint slg_village_buildings_position_key unique (village_id, x, y)
);

create index if not exists slg_village_buildings_village_idx
  on public.slg_village_buildings (village_id);

-- ---------------------------------------------------------------------------
-- 4. 건설 보관함
-- ---------------------------------------------------------------------------

create table if not exists public.slg_village_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.platform_users (id) on delete cascade,
  building_id uuid not null references public.slg_building_catalog (id) on delete restrict,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  constraint slg_village_inventory_user_building_key unique (user_id, building_id)
);

insert into public.slg_building_catalog (
  code, title, description, tier, cost_acorns, min_growth, sprite_key, sort_order
)
values
  ('path', '돌길', '마을 길을 깔아보세요.', 1, 10, 0, 'slg_path', 1),
  ('bench', '광장 벤치', '쉬어가는 벤치입니다.', 1, 30, 0, 'slg_bench', 2),
  ('cottage', '작은 집', '마을 주민의 집.', 2, 80, 200, 'slg_cottage', 3),
  ('fountain', '분수', '마을 한가운데 분수.', 2, 120, 300, 'slg_fountain', 4),
  ('gym', '헬스장', '운동의 상징 건물.', 2, 150, 500, 'slg_gym', 5),
  ('stadium', '운동장', '센터 회원의 훈련장.', 3, 250, 1000, 'slg_stadium', 6),
  ('town_hall', '마을회관', '성장의 결실을 보여주는 회관.', 4, 500, 2000, 'slg_town_hall', 7)
on conflict (code) do update
set
  title = excluded.title,
  description = excluded.description,
  tier = excluded.tier,
  cost_acorns = excluded.cost_acorns,
  min_growth = excluded.min_growth,
  sprite_key = excluded.sprite_key,
  sort_order = excluded.sort_order,
  is_active = true;

alter table public.slg_building_catalog enable row level security;
alter table public.slg_member_villages enable row level security;
alter table public.slg_village_buildings enable row level security;
alter table public.slg_village_inventory enable row level security;

drop policy if exists "slg_building_catalog_read" on public.slg_building_catalog;
create policy "slg_building_catalog_read" on public.slg_building_catalog
  for select using (true);

drop policy if exists "slg_member_villages_all" on public.slg_member_villages;
create policy "slg_member_villages_all" on public.slg_member_villages
  for all using (true) with check (true);

drop policy if exists "slg_village_buildings_all" on public.slg_village_buildings;
create policy "slg_village_buildings_all" on public.slg_village_buildings
  for all using (true) with check (true);

drop policy if exists "slg_village_inventory_all" on public.slg_village_inventory;
create policy "slg_village_inventory_all" on public.slg_village_inventory
  for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 5. 마을 생성
-- ---------------------------------------------------------------------------

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
  if found then return v_id; end if;

  insert into public.slg_member_villages (user_id, width, height, plaza_x, plaza_y)
  values (p_user_id, 8, 8, 3, 3)
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. 마을 상태 조회
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
  v_catalog jsonb;
  v_inventory jsonb;
  v_buildings jsonb;
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

  select coalesce(jsonb_agg(row_to_json(c) order by c.sort_order), '[]'::jsonb)
  into v_catalog
  from (
    select id, code, title, description, tier, cost_acorns, min_growth, sprite_key, sort_order,
      (v_growth >= min_growth) as is_unlocked
    from public.slg_building_catalog
    where is_active
    order by sort_order
  ) c;

  select coalesce(jsonb_agg(row_to_json(i) order by i.sort_order), '[]'::jsonb)
  into v_inventory
  from (
    select svi.id, svi.building_id, sbc.title, sbc.code, sbc.sprite_key, sbc.tier, svi.quantity, sbc.sort_order
    from public.slg_village_inventory svi
    inner join public.slg_building_catalog sbc on sbc.id = svi.building_id
    where svi.user_id = v_user_id and svi.quantity > 0
    order by sbc.sort_order
  ) i;

  select coalesce(jsonb_agg(row_to_json(b) order by b.y, b.x), '[]'::jsonb)
  into v_buildings
  from (
    select
      svb.id,
      svb.building_id,
      sbc.code,
      sbc.title,
      sbc.sprite_key,
      sbc.tier,
      svb.x,
      svb.y,
      svb.placed_at
    from public.slg_village_buildings svb
    inner join public.slg_building_catalog sbc on sbc.id = svb.building_id
    where svb.village_id = v_village.id
    order by svb.y, svb.x
  ) b;

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
    'tree_stage_key', v_tree ->> 'current_stage_key',
    'tree_stage_name', v_tree ->> 'current_stage_name',
    'catalog', v_catalog,
    'inventory', v_inventory,
    'buildings', v_buildings
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. 건물 구매
-- ---------------------------------------------------------------------------

create or replace function public.purchase_slg_building(
  p_member_id uuid,
  p_building_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_item public.slg_building_catalog%rowtype;
  v_growth integer := 0;
  v_acorns integer := 0;
  v_event_key text;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);
  perform public.ensure_slg_village_for_user(v_user_id);

  select * into v_item from public.slg_building_catalog
  where id = p_building_id and is_active;
  if not found then raise exception 'SLG_BUILDING_NOT_FOUND'; end if;

  select coalesce(total_growth, 0), coalesce(current_acorns, 0)
  into v_growth, v_acorns
  from public.user_growth_balances where user_id = v_user_id for update;

  if v_growth < v_item.min_growth then
    raise exception 'SLG_GROWTH_REQUIRED';
  end if;

  if v_acorns < v_item.cost_acorns then
    raise exception 'INSUFFICIENT_ACORNS';
  end if;

  v_event_key := 'slg_purchase:' || p_building_id::text || ':' || gen_random_uuid()::text;

  update public.user_growth_balances
  set current_acorns = current_acorns - v_item.cost_acorns, updated_at = now()
  where user_id = v_user_id;

  insert into public.acorn_transactions (user_id, amount, type, reason, event_key)
  values (v_user_id, v_item.cost_acorns, 'spend', 'SLG_VILLAGE', v_event_key);

  insert into public.slg_village_inventory (user_id, building_id, quantity)
  values (v_user_id, p_building_id, 1)
  on conflict (user_id, building_id) do update
  set quantity = public.slg_village_inventory.quantity + 1, updated_at = now();

  return public.get_slg_village_state(p_member_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. 배치 / 이동 / 회수
-- ---------------------------------------------------------------------------

create or replace function public.place_slg_building(
  p_member_id uuid,
  p_building_id uuid,
  p_x integer,
  p_y integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_village public.slg_member_villages%rowtype;
  v_qty integer := 0;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);
  select * into v_village from public.slg_member_villages where user_id = v_user_id;
  if not found then raise exception 'SLG_VILLAGE_NOT_FOUND'; end if;

  if p_x < 0 or p_y < 0 or p_x >= v_village.width or p_y >= v_village.height then
    raise exception 'SLG_OUT_OF_BOUNDS';
  end if;

  if p_x = v_village.plaza_x and p_y = v_village.plaza_y then
    raise exception 'SLG_PLAZA_BLOCKED';
  end if;

  if exists (
    select 1 from public.slg_village_buildings
    where village_id = v_village.id and x = p_x and y = p_y
  ) then
    raise exception 'SLG_TILE_OCCUPIED';
  end if;

  select quantity into v_qty from public.slg_village_inventory
  where user_id = v_user_id and building_id = p_building_id for update;

  if coalesce(v_qty, 0) < 1 then raise exception 'SLG_INVENTORY_EMPTY'; end if;

  update public.slg_village_inventory
  set quantity = quantity - 1, updated_at = now()
  where user_id = v_user_id and building_id = p_building_id;

  delete from public.slg_village_inventory
  where user_id = v_user_id and building_id = p_building_id and quantity <= 0;

  insert into public.slg_village_buildings (village_id, building_id, x, y)
  values (v_village.id, p_building_id, p_x, p_y);

  return public.get_slg_village_state(p_member_id);
end;
$$;

create or replace function public.move_slg_building(
  p_member_id uuid,
  p_placement_id uuid,
  p_x integer,
  p_y integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_village public.slg_member_villages%rowtype;
  v_row public.slg_village_buildings%rowtype;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);
  select * into v_village from public.slg_member_villages where user_id = v_user_id;

  select * into v_row from public.slg_village_buildings
  where id = p_placement_id and village_id = v_village.id for update;
  if not found then raise exception 'SLG_PLACEMENT_NOT_FOUND'; end if;

  if p_x < 0 or p_y < 0 or p_x >= v_village.width or p_y >= v_village.height then
    raise exception 'SLG_OUT_OF_BOUNDS';
  end if;

  if p_x = v_village.plaza_x and p_y = v_village.plaza_y then
    raise exception 'SLG_PLAZA_BLOCKED';
  end if;

  if exists (
    select 1 from public.slg_village_buildings
    where village_id = v_village.id and x = p_x and y = p_y and id <> p_placement_id
  ) then
    raise exception 'SLG_TILE_OCCUPIED';
  end if;

  update public.slg_village_buildings set x = p_x, y = p_y, placed_at = now()
  where id = p_placement_id;

  return public.get_slg_village_state(p_member_id);
end;
$$;

create or replace function public.retrieve_slg_building(
  p_member_id uuid,
  p_placement_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_village public.slg_member_villages%rowtype;
  v_row public.slg_village_buildings%rowtype;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);
  select * into v_village from public.slg_member_villages where user_id = v_user_id;

  select * into v_row from public.slg_village_buildings
  where id = p_placement_id and village_id = v_village.id for update;
  if not found then raise exception 'SLG_PLACEMENT_NOT_FOUND'; end if;

  delete from public.slg_village_buildings where id = p_placement_id;

  insert into public.slg_village_inventory (user_id, building_id, quantity)
  values (v_user_id, v_row.building_id, 1)
  on conflict (user_id, building_id) do update
  set quantity = public.slg_village_inventory.quantity + 1, updated_at = now();

  return public.get_slg_village_state(p_member_id);
end;
$$;

grant execute on function public.ensure_slg_village_for_user(uuid) to anon, authenticated, service_role;
grant execute on function public.get_slg_village_state(uuid) to anon, authenticated, service_role;
grant execute on function public.purchase_slg_building(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.place_slg_building(uuid, uuid, integer, integer) to anon, authenticated, service_role;
grant execute on function public.move_slg_building(uuid, uuid, integer, integer) to anon, authenticated, service_role;
grant execute on function public.retrieve_slg_building(uuid, uuid) to anon, authenticated, service_role;
