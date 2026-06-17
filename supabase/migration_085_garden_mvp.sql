-- MotionHub 정원(Garden) MVP — 도토리 상점 · 6x6 배치
-- migration_084 이후 실행

-- ---------------------------------------------------------------------------
-- 1. 상점 아이템 마스터
-- ---------------------------------------------------------------------------

create table if not exists public.garden_shop_items (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  item_type text not null check (
    item_type in ('flower', 'bench', 'street_lamp', 'stone_path', 'pond')
  ),
  cost_acorns integer not null check (cost_acorns > 0),
  sprite_key text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint garden_shop_items_sprite_key_key unique (sprite_key)
);

-- ---------------------------------------------------------------------------
-- 2. 회원 정원 (6x6, 회원당 1개)
-- ---------------------------------------------------------------------------

create table if not exists public.gardens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.platform_users (id) on delete cascade,
  width integer not null default 6 check (width > 0 and width <= 12),
  height integer not null default 6 check (height > 0 and height <= 12),
  tree_x integer not null default 2 check (tree_x >= 0),
  tree_y integer not null default 2 check (tree_y >= 0),
  created_at timestamptz not null default now(),
  constraint gardens_user_id_key unique (user_id)
);

-- ---------------------------------------------------------------------------
-- 3. 배치된 아이템
-- ---------------------------------------------------------------------------

create table if not exists public.garden_items (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens (id) on delete cascade,
  shop_item_id uuid not null references public.garden_shop_items (id) on delete restrict,
  x integer not null check (x >= 0),
  y integer not null check (y >= 0),
  placed_at timestamptz not null default now(),
  constraint garden_items_position_key unique (garden_id, x, y)
);

create index if not exists garden_items_garden_idx
  on public.garden_items (garden_id);

-- ---------------------------------------------------------------------------
-- 4. 구매 보관 (배치 전 인벤토리)
-- ---------------------------------------------------------------------------

create table if not exists public.user_garden_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.platform_users (id) on delete cascade,
  shop_item_id uuid not null references public.garden_shop_items (id) on delete restrict,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  constraint user_garden_inventory_user_item_key unique (user_id, shop_item_id)
);

insert into public.garden_shop_items (
  item_name, item_type, cost_acorns, sprite_key, sort_order
)
values
  ('꽃', 'flower', 20, 'flower', 1),
  ('벤치', 'bench', 50, 'bench', 2),
  ('가로등', 'street_lamp', 80, 'street_lamp', 3),
  ('돌길', 'stone_path', 10, 'stone_path', 4),
  ('작은 연못', 'pond', 150, 'pond', 5)
on conflict (sprite_key) do update
set
  item_name = excluded.item_name,
  item_type = excluded.item_type,
  cost_acorns = excluded.cost_acorns,
  sort_order = excluded.sort_order,
  is_active = true;

alter table public.garden_shop_items enable row level security;
alter table public.gardens enable row level security;
alter table public.garden_items enable row level security;
alter table public.user_garden_inventory enable row level security;

drop policy if exists "garden_shop_items_read" on public.garden_shop_items;
create policy "garden_shop_items_read" on public.garden_shop_items
  for select using (true);

drop policy if exists "gardens_all" on public.gardens;
create policy "gardens_all" on public.gardens
  for all using (true) with check (true);

drop policy if exists "garden_items_all" on public.garden_items;
create policy "garden_items_all" on public.garden_items
  for all using (true) with check (true);

drop policy if exists "user_garden_inventory_all" on public.user_garden_inventory;
create policy "user_garden_inventory_all" on public.user_garden_inventory
  for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 5. 정원 생성
-- ---------------------------------------------------------------------------

create or replace function public.ensure_garden_for_user(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_garden_id uuid;
begin
  select id into v_garden_id
  from public.gardens
  where user_id = p_user_id;

  if found then
    return v_garden_id;
  end if;

  insert into public.gardens (user_id, width, height, tree_x, tree_y)
  values (p_user_id, 6, 6, 2, 2)
  returning id into v_garden_id;

  return v_garden_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. 정원 상태 조회
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

  select * into v_garden
  from public.gardens
  where user_id = v_user_id;

  select coalesce(ugb.current_acorns, 0) into v_balance
  from public.user_growth_balances ugb
  where ugb.user_id = v_user_id;

  if not found then
    insert into public.user_growth_balances (user_id)
    values (v_user_id)
    on conflict (user_id) do nothing;
    v_balance := 0;
  end if;

  select public.compute_growth_tree_stage(
    coalesce(
      (select total_growth from public.user_growth_balances where user_id = v_user_id),
      0
    )
  ) into v_tree;

  select coalesce(jsonb_agg(row_to_json(s) order by s.sort_order), '[]'::jsonb)
  into v_shop
  from (
    select id, item_name, item_type, cost_acorns, sprite_key, sort_order
    from public.garden_shop_items
    where is_active
    order by sort_order
  ) s;

  select coalesce(jsonb_agg(row_to_json(i) order by i.item_name), '[]'::jsonb)
  into v_inventory
  from (
    select
      ugi.id,
      ugi.shop_item_id,
      gsi.item_name,
      gsi.item_type,
      gsi.sprite_key,
      ugi.quantity
    from public.user_garden_inventory ugi
    inner join public.garden_shop_items gsi on gsi.id = ugi.shop_item_id
    where ugi.user_id = v_user_id
      and ugi.quantity > 0
    order by gsi.sort_order
  ) i;

  select coalesce(jsonb_agg(row_to_json(p) order by p.y, p.x), '[]'::jsonb)
  into v_placed
  from (
    select
      gi.id,
      gi.shop_item_id,
      gsi.item_name,
      gsi.item_type,
      gsi.sprite_key,
      gi.x,
      gi.y,
      gi.placed_at
    from public.garden_items gi
    inner join public.garden_shop_items gsi on gsi.id = gi.shop_item_id
    where gi.garden_id = v_garden.id
    order by gi.y, gi.x
  ) p;

  return jsonb_build_object(
    'ok', true,
    'user_id', v_user_id,
    'member_id', p_member_id,
    'garden', jsonb_build_object(
      'id', v_garden.id,
      'width', v_garden.width,
      'height', v_garden.height,
      'tree_x', v_garden.tree_x,
      'tree_y', v_garden.tree_y
    ),
    'current_acorns', v_balance,
    'tree_stage_key', v_tree ->> 'current_stage_key',
    'tree_stage_name', v_tree ->> 'current_stage_name',
    'shop_items', v_shop,
    'inventory', v_inventory,
    'placed_items', v_placed
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. 상점 구매 (도토리 차감)
-- ---------------------------------------------------------------------------

create or replace function public.purchase_garden_shop_item(
  p_member_id uuid,
  p_shop_item_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_item public.garden_shop_items%rowtype;
  v_balance integer := 0;
  v_event_key text;
  v_inventory_id uuid;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);
  perform public.ensure_garden_for_user(v_user_id);

  select * into v_item
  from public.garden_shop_items
  where id = p_shop_item_id
    and is_active;

  if not found then
    raise exception 'GARDEN_ITEM_NOT_FOUND';
  end if;

  insert into public.user_growth_balances (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select current_acorns into v_balance
  from public.user_growth_balances
  where user_id = v_user_id
  for update;

  if coalesce(v_balance, 0) < v_item.cost_acorns then
    raise exception 'INSUFFICIENT_ACORNS';
  end if;

  v_event_key := 'garden_purchase:' || p_shop_item_id::text || ':' || gen_random_uuid()::text;

  update public.user_growth_balances
  set
    current_acorns = current_acorns - v_item.cost_acorns,
    updated_at = now()
  where user_id = v_user_id;

  insert into public.acorn_transactions (
    user_id, amount, type, reason, event_key
  )
  values (
    v_user_id,
    v_item.cost_acorns,
    'spend',
    'GARDEN_SHOP',
    v_event_key
  );

  insert into public.user_garden_inventory (user_id, shop_item_id, quantity)
  values (v_user_id, p_shop_item_id, 1)
  on conflict (user_id, shop_item_id) do update
  set
    quantity = public.user_garden_inventory.quantity + 1,
    updated_at = now()
  returning id into v_inventory_id;

  return public.get_garden_state(p_member_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. 배치
-- ---------------------------------------------------------------------------

create or replace function public.place_garden_item(
  p_member_id uuid,
  p_shop_item_id uuid,
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
  v_garden public.gardens%rowtype;
  v_qty integer := 0;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);

  select * into v_garden
  from public.gardens
  where user_id = v_user_id;

  if not found then
    raise exception 'GARDEN_NOT_FOUND';
  end if;

  if p_x < 0 or p_y < 0 or p_x >= v_garden.width or p_y >= v_garden.height then
    raise exception 'GARDEN_OUT_OF_BOUNDS';
  end if;

  if p_x = v_garden.tree_x and p_y = v_garden.tree_y then
    raise exception 'GARDEN_TREE_TILE_BLOCKED';
  end if;

  if exists (
    select 1 from public.garden_items gi
    where gi.garden_id = v_garden.id and gi.x = p_x and gi.y = p_y
  ) then
    raise exception 'GARDEN_TILE_OCCUPIED';
  end if;

  select quantity into v_qty
  from public.user_garden_inventory
  where user_id = v_user_id
    and shop_item_id = p_shop_item_id
  for update;

  if coalesce(v_qty, 0) < 1 then
    raise exception 'GARDEN_INVENTORY_EMPTY';
  end if;

  update public.user_garden_inventory
  set quantity = quantity - 1, updated_at = now()
  where user_id = v_user_id
    and shop_item_id = p_shop_item_id;

  delete from public.user_garden_inventory
  where user_id = v_user_id
    and shop_item_id = p_shop_item_id
    and quantity <= 0;

  insert into public.garden_items (garden_id, shop_item_id, x, y)
  values (v_garden.id, p_shop_item_id, p_x, p_y);

  return public.get_garden_state(p_member_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. 이동
-- ---------------------------------------------------------------------------

create or replace function public.move_garden_item(
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
  v_garden public.gardens%rowtype;
  v_item public.garden_items%rowtype;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);

  select * into v_garden
  from public.gardens
  where user_id = v_user_id;

  if not found then
    raise exception 'GARDEN_NOT_FOUND';
  end if;

  select * into v_item
  from public.garden_items
  where id = p_placement_id
    and garden_id = v_garden.id
  for update;

  if not found then
    raise exception 'GARDEN_PLACEMENT_NOT_FOUND';
  end if;

  if p_x < 0 or p_y < 0 or p_x >= v_garden.width or p_y >= v_garden.height then
    raise exception 'GARDEN_OUT_OF_BOUNDS';
  end if;

  if p_x = v_garden.tree_x and p_y = v_garden.tree_y then
    raise exception 'GARDEN_TREE_TILE_BLOCKED';
  end if;

  if exists (
    select 1 from public.garden_items gi
    where gi.garden_id = v_garden.id
      and gi.x = p_x
      and gi.y = p_y
      and gi.id <> p_placement_id
  ) then
    raise exception 'GARDEN_TILE_OCCUPIED';
  end if;

  if v_item.x = p_x and v_item.y = p_y then
    return public.get_garden_state(p_member_id);
  end if;

  update public.garden_items
  set x = p_x, y = p_y, placed_at = now()
  where id = p_placement_id;

  return public.get_garden_state(p_member_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. 회수 (도토리 환급 없음, 인벤토리로 복귀)
-- ---------------------------------------------------------------------------

create or replace function public.retrieve_garden_item(
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
  v_garden public.gardens%rowtype;
  v_item public.garden_items%rowtype;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);

  select * into v_garden
  from public.gardens
  where user_id = v_user_id;

  if not found then
    raise exception 'GARDEN_NOT_FOUND';
  end if;

  select * into v_item
  from public.garden_items
  where id = p_placement_id
    and garden_id = v_garden.id
  for update;

  if not found then
    raise exception 'GARDEN_PLACEMENT_NOT_FOUND';
  end if;

  delete from public.garden_items where id = p_placement_id;

  insert into public.user_garden_inventory (user_id, shop_item_id, quantity)
  values (v_user_id, v_item.shop_item_id, 1)
  on conflict (user_id, shop_item_id) do update
  set
    quantity = public.user_garden_inventory.quantity + 1,
    updated_at = now();

  return public.get_garden_state(p_member_id);
end;
$$;

grant execute on function public.ensure_garden_for_user(uuid) to anon, authenticated, service_role;
grant execute on function public.get_garden_state(uuid) to anon, authenticated, service_role;
grant execute on function public.purchase_garden_shop_item(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.place_garden_item(uuid, uuid, integer, integer) to anon, authenticated, service_role;
grant execute on function public.move_garden_item(uuid, uuid, integer, integer) to anon, authenticated, service_role;
grant execute on function public.retrieve_garden_item(uuid, uuid) to anon, authenticated, service_role;
