-- MotionHub 성장 시스템 MVP (Growth + Acorn + 운동나무)
-- Supabase SQL Editor에서 migration_077 이후 실행

-- ---------------------------------------------------------------------------
-- 1. 플랫폼 사용자 (성장 데이터 글로벌 계정)
-- ---------------------------------------------------------------------------

create table if not exists public.platform_users (
  id uuid primary key default gen_random_uuid(),
  phone_normalized text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_users_phone_normalized_key unique (phone_normalized)
);

create index if not exists platform_users_phone_idx
  on public.platform_users (phone_normalized);

create table if not exists public.platform_user_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.platform_users (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  center_id uuid not null references public.centers (id) on delete cascade,
  linked_at timestamptz not null default now(),
  constraint platform_user_members_member_id_key unique (member_id)
);

create index if not exists platform_user_members_user_id_idx
  on public.platform_user_members (user_id);

-- ---------------------------------------------------------------------------
-- 2. 잔액 · 원장
-- ---------------------------------------------------------------------------

create table if not exists public.user_growth_balances (
  user_id uuid primary key references public.platform_users (id) on delete cascade,
  total_growth integer not null default 0 check (total_growth >= 0),
  current_acorns integer not null default 0 check (current_acorns >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.growth_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.platform_users (id) on delete cascade,
  event_type text not null,
  amount integer not null check (amount > 0),
  source text,
  event_key text,
  created_at timestamptz not null default now()
);

create unique index if not exists growth_transactions_event_key_uidx
  on public.growth_transactions (user_id, event_key)
  where event_key is not null;

create index if not exists growth_transactions_user_created_idx
  on public.growth_transactions (user_id, created_at desc);

create table if not exists public.acorn_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.platform_users (id) on delete cascade,
  amount integer not null check (amount > 0),
  type text not null check (type in ('earn', 'spend')),
  reason text,
  event_key text,
  created_at timestamptz not null default now(),
  constraint acorn_transactions_spend_check check (
    type <> 'spend' or reason is not null
  )
);

create index if not exists acorn_transactions_user_created_idx
  on public.acorn_transactions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. 운동나무 단계 마스터
-- ---------------------------------------------------------------------------

create table if not exists public.growth_tree_stages (
  stage_key text primary key,
  sort_order integer not null unique,
  min_growth integer not null,
  display_name_ko text not null,
  is_active boolean not null default true
);

insert into public.growth_tree_stages (stage_key, sort_order, min_growth, display_name_ko)
values
  ('none', 0, 0, '시작 전'),
  ('seed', 1, 10, '씨앗'),
  ('sprout', 2, 100, '새싹'),
  ('small', 3, 500, '어린 나무'),
  ('large', 4, 1000, '큰 나무'),
  ('sakura', 5, 3000, '벚꽃나무')
on conflict (stage_key) do update set
  sort_order = excluded.sort_order,
  min_growth = excluded.min_growth,
  display_name_ko = excluded.display_name_ko;

-- ---------------------------------------------------------------------------
-- 4. RLS (기존 reward_* 패턴)
-- ---------------------------------------------------------------------------

alter table public.platform_users enable row level security;
alter table public.platform_user_members enable row level security;
alter table public.user_growth_balances enable row level security;
alter table public.growth_transactions enable row level security;
alter table public.acorn_transactions enable row level security;
alter table public.growth_tree_stages enable row level security;

drop policy if exists "platform_users_all" on public.platform_users;
create policy "platform_users_all" on public.platform_users
  for all using (true) with check (true);

drop policy if exists "platform_user_members_all" on public.platform_user_members;
create policy "platform_user_members_all" on public.platform_user_members
  for all using (true) with check (true);

drop policy if exists "user_growth_balances_all" on public.user_growth_balances;
create policy "user_growth_balances_all" on public.user_growth_balances
  for all using (true) with check (true);

drop policy if exists "growth_transactions_all" on public.growth_transactions;
create policy "growth_transactions_all" on public.growth_transactions
  for all using (true) with check (true);

drop policy if exists "acorn_transactions_all" on public.acorn_transactions;
create policy "acorn_transactions_all" on public.acorn_transactions
  for all using (true) with check (true);

drop policy if exists "growth_tree_stages_read" on public.growth_tree_stages;
create policy "growth_tree_stages_read" on public.growth_tree_stages
  for select using (true);

-- ---------------------------------------------------------------------------
-- 5. 회원 → 플랫폼 사용자 보장
-- ---------------------------------------------------------------------------

create or replace function public.ensure_platform_user_for_member(p_member_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_phone text;
  v_center_id uuid;
begin
  select user_id into v_user_id
  from public.platform_user_members
  where member_id = p_member_id;

  if v_user_id is not null then
    return v_user_id;
  end if;

  select
    regexp_replace(m.phone, '\D', '', 'g'),
    m.center_id
  into v_phone, v_center_id
  from public.members m
  where m.id = p_member_id;

  if v_phone is null or length(v_phone) < 10 then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  insert into public.platform_users (phone_normalized)
  values (v_phone)
  on conflict (phone_normalized) do update
    set updated_at = now()
  returning id into v_user_id;

  if v_user_id is null then
    select id into v_user_id
    from public.platform_users
    where phone_normalized = v_phone;
  end if;

  insert into public.platform_user_members (user_id, member_id, center_id)
  values (v_user_id, p_member_id, v_center_id)
  on conflict (member_id) do update
    set user_id = excluded.user_id,
        center_id = excluded.center_id;

  insert into public.user_growth_balances (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  return v_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. 운동나무 단계 계산
-- ---------------------------------------------------------------------------

create or replace function public.compute_growth_tree_stage(p_total_growth integer)
returns jsonb
language sql
stable
set search_path = public
as $$
  with current_stage as (
    select stage_key, sort_order, min_growth, display_name_ko
    from public.growth_tree_stages
    where is_active
      and min_growth <= greatest(0, coalesce(p_total_growth, 0))
    order by min_growth desc, sort_order desc
    limit 1
  ),
  next_stage as (
    select stage_key, sort_order, min_growth, display_name_ko
    from public.growth_tree_stages
    where is_active
      and min_growth > greatest(0, coalesce(p_total_growth, 0))
    order by min_growth asc, sort_order asc
    limit 1
  )
  select jsonb_build_object(
    'current_stage_key', coalesce((select stage_key from current_stage), 'none'),
    'current_stage_name', coalesce((select display_name_ko from current_stage), '시작 전'),
    'current_min_growth', coalesce((select min_growth from current_stage), 0),
    'next_stage_key', (select stage_key from next_stage),
    'next_stage_name', (select display_name_ko from next_stage),
    'next_min_growth', (select min_growth from next_stage),
    'growth_until_next', case
      when (select min_growth from next_stage) is null then 0
      else greatest(0, (select min_growth from next_stage) - greatest(0, coalesce(p_total_growth, 0)))
    end,
    'is_max_stage', (select min_growth from next_stage) is null
  );
$$;

-- ---------------------------------------------------------------------------
-- 7. post_growth_event
-- ---------------------------------------------------------------------------

create or replace function public.post_growth_event(
  p_user_id uuid,
  p_event_type text,
  p_event_key text default null,
  p_source text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_growth_amount integer := 0;
  v_acorn_amount integer := 0;
  v_event_key text := nullif(trim(coalesce(p_event_key, '')), '');
  v_existing uuid;
  v_balance public.user_growth_balances%rowtype;
  v_tree jsonb;
begin
  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED';
  end if;

  case upper(trim(coalesce(p_event_type, '')))
    when 'PT_ATTENDANCE' then
      v_growth_amount := 10;
      v_acorn_amount := 1;
    when 'WORKOUT_LOG' then
      v_growth_amount := 5;
      v_acorn_amount := 1;
    when 'CHALLENGE' then
      v_growth_amount := 50;
      v_acorn_amount := 5;
    when 'MANUAL' then
      raise exception 'MANUAL_REQUIRES_AMOUNTS';
    else
      raise exception 'UNKNOWN_EVENT_TYPE';
  end case;

  if v_event_key is not null then
    select id into v_existing
    from public.growth_transactions
    where user_id = p_user_id
      and event_key = v_event_key
    limit 1;

    if v_existing is not null then
      select * into v_balance
      from public.user_growth_balances
      where user_id = p_user_id;

      return jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'user_id', p_user_id,
        'total_growth', coalesce(v_balance.total_growth, 0),
        'current_acorns', coalesce(v_balance.current_acorns, 0),
        'tree', public.compute_growth_tree_stage(coalesce(v_balance.total_growth, 0))
      );
    end if;
  end if;

  insert into public.user_growth_balances (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  insert into public.growth_transactions (user_id, event_type, amount, source, event_key)
  values (p_user_id, upper(trim(p_event_type)), v_growth_amount, p_source, v_event_key);

  if v_acorn_amount > 0 then
    insert into public.acorn_transactions (user_id, amount, type, reason, event_key)
    values (
      p_user_id,
      v_acorn_amount,
      'earn',
      upper(trim(p_event_type)),
      case when v_event_key is not null then v_event_key || ':acorn' else null end
    );
  end if;

  update public.user_growth_balances
  set
    total_growth = total_growth + v_growth_amount,
    current_acorns = current_acorns + v_acorn_amount,
    updated_at = now()
  where user_id = p_user_id
  returning * into v_balance;

  v_tree := public.compute_growth_tree_stage(v_balance.total_growth);

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'user_id', p_user_id,
    'growth_awarded', v_growth_amount,
    'acorns_awarded', v_acorn_amount,
    'total_growth', v_balance.total_growth,
    'current_acorns', v_balance.current_acorns,
    'tree', v_tree
  );
end;
$$;

create or replace function public.post_growth_event_for_member(
  p_member_id uuid,
  p_event_type text,
  p_event_key text default null,
  p_source text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);
  return public.post_growth_event(v_user_id, p_event_type, p_event_key, p_source);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. get_growth_profile
-- ---------------------------------------------------------------------------

create or replace function public.get_growth_profile(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_balance public.user_growth_balances%rowtype;
  v_mile integer := 0;
  v_tree jsonb;
  v_recent jsonb;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);

  select * into v_balance
  from public.user_growth_balances
  where user_id = v_user_id;

  if not found then
    insert into public.user_growth_balances (user_id)
    values (v_user_id)
    returning * into v_balance;
  end if;

  select coalesce(rb.move_mile, 0) into v_mile
  from public.reward_balances rb
  where rb.member_id = p_member_id;

  v_tree := public.compute_growth_tree_stage(v_balance.total_growth);

  select coalesce(jsonb_agg(row_to_json(t) order by t.created_at desc), '[]'::jsonb)
  into v_recent
  from (
    select
      gt.id,
      gt.event_type,
      gt.amount as growth_amount,
      gt.source,
      gt.created_at
    from public.growth_transactions gt
    where gt.user_id = v_user_id
    order by gt.created_at desc
    limit 20
  ) t;

  return jsonb_build_object(
    'ok', true,
    'user_id', v_user_id,
    'member_id', p_member_id,
    'total_growth', v_balance.total_growth,
    'current_acorns', v_balance.current_acorns,
    'current_mile', v_mile,
    'current_stage_key', v_tree ->> 'current_stage_key',
    'current_stage_name', v_tree ->> 'current_stage_name',
    'next_stage_key', v_tree ->> 'next_stage_key',
    'next_stage_name', v_tree ->> 'next_stage_name',
    'growth_until_next', (v_tree ->> 'growth_until_next')::integer,
    'is_max_stage', (v_tree ->> 'is_max_stage')::boolean,
    'tree', v_tree,
    'recent_growth', v_recent
  );
end;
$$;

grant execute on function public.ensure_platform_user_for_member(uuid) to anon, authenticated, service_role;
grant execute on function public.compute_growth_tree_stage(integer) to anon, authenticated, service_role;
grant execute on function public.post_growth_event(uuid, text, text, text) to anon, authenticated, service_role;
grant execute on function public.post_growth_event_for_member(uuid, text, text, text) to anon, authenticated, service_role;
grant execute on function public.get_growth_profile(uuid) to anon, authenticated, service_role;
