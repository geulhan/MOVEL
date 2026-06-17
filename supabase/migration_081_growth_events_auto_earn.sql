-- MotionHub 성장 자동 적립: growth_events + 중복 방지 + 성장 피드
-- migration_080 이후 실행

-- ---------------------------------------------------------------------------
-- 1. growth_events (적립 원장 · 피드 · event_key UNIQUE)
-- ---------------------------------------------------------------------------

create table if not exists public.growth_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.platform_users (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  event_type text not null,
  event_key text not null,
  title_ko text not null,
  growth_amount integer not null check (growth_amount >= 0),
  acorn_amount integer not null default 0 check (acorn_amount >= 0),
  source text,
  created_at timestamptz not null default now(),
  constraint growth_events_event_key_key unique (event_key)
);

create index if not exists growth_events_user_created_idx
  on public.growth_events (user_id, created_at desc);

create index if not exists growth_events_member_created_idx
  on public.growth_events (member_id, created_at desc)
  where member_id is not null;

alter table public.growth_events enable row level security;

drop policy if exists "growth_events_all" on public.growth_events;
create policy "growth_events_all" on public.growth_events
  for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 2. 체성분 측정: 30일 1회 제한
-- ---------------------------------------------------------------------------

alter table public.growth_reward_rules
  drop constraint if exists growth_reward_rules_limit_period_check;

alter table public.growth_reward_rules
  add constraint growth_reward_rules_limit_period_check
  check (limit_period in ('none', 'monthly', 'rolling_30d'));

update public.growth_reward_rules
set
  limit_period = 'rolling_30d',
  limit_count = 1,
  updated_at = now()
where event_type = 'BODY_COMPOSITION';

-- ---------------------------------------------------------------------------
-- 3. post_growth_event — growth_events 기반 중복 방지 + 피드 생성
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
  v_tree jsonb;
  v_feed_id uuid;
begin
  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED';
  end if;

  if v_event_key is null then
    raise exception 'EVENT_KEY_REQUIRED';
  end if;

  v_event_type := upper(trim(coalesce(p_event_type, '')));
  if v_event_type = 'CHALLENGE' then
    v_event_type := 'CHALLENGE_COMPLETE';
  end if;

  if v_event_type = 'MANUAL' then
    raise exception 'MANUAL_REQUIRES_AMOUNTS';
  end if;

  select * into v_rule
  from public.growth_reward_rules
  where event_type = v_event_type
    and is_active;

  if not found then
    raise exception 'UNKNOWN_EVENT_TYPE';
  end if;

  v_growth_amount := v_rule.growth_reward;
  v_acorn_amount := v_rule.acorn_reward;

  if v_growth_amount <= 0 and v_acorn_amount <= 0 then
    raise exception 'INACTIVE_REWARD_RULE';
  end if;

  -- 이미 적립된 event_key (전역 UNIQUE)
  if exists (
    select 1 from public.growth_events ge where ge.event_key = v_event_key
  ) then
    select * into v_balance
    from public.user_growth_balances
    where user_id = p_user_id;

    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'user_id', p_user_id,
      'event_key', v_event_key,
      'total_growth', coalesce(v_balance.total_growth, 0),
      'current_acorns', coalesce(v_balance.current_acorns, 0),
      'tree', public.compute_growth_tree_stage(coalesce(v_balance.total_growth, 0))
    );
  end if;

  if v_rule.limit_period = 'monthly' and coalesce(v_rule.limit_count, 0) > 0 then
    select count(*)::integer into v_period_count
    from public.growth_events ge
    where ge.user_id = p_user_id
      and ge.event_type = v_event_type
      and ge.created_at >= date_trunc(
        'month',
        timezone('Asia/Seoul', now()) at time zone 'Asia/Seoul'
      );

    if v_period_count >= v_rule.limit_count then
      select * into v_balance
      from public.user_growth_balances
      where user_id = p_user_id;

      return jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'limit_reached', true,
        'user_id', p_user_id,
        'total_growth', coalesce(v_balance.total_growth, 0),
        'current_acorns', coalesce(v_balance.current_acorns, 0),
        'tree', public.compute_growth_tree_stage(coalesce(v_balance.total_growth, 0))
      );
    end if;
  end if;

  if v_rule.limit_period = 'rolling_30d' and coalesce(v_rule.limit_count, 0) > 0 then
    select count(*)::integer into v_period_count
    from public.growth_events ge
    where ge.user_id = p_user_id
      and ge.event_type = v_event_type
      and ge.created_at >= now() - interval '30 days';

    if v_period_count >= v_rule.limit_count then
      select * into v_balance
      from public.user_growth_balances
      where user_id = p_user_id;

      return jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'limit_reached', true,
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

  insert into public.growth_events (
    user_id,
    member_id,
    event_type,
    event_key,
    title_ko,
    growth_amount,
    acorn_amount,
    source
  )
  values (
    p_user_id,
    p_member_id,
    v_event_type,
    v_event_key,
    v_rule.display_name_ko,
    v_growth_amount,
    v_acorn_amount,
    p_source
  )
  returning id into v_feed_id;

  insert into public.growth_transactions (user_id, event_type, amount, source, event_key)
  values (p_user_id, v_event_type, v_growth_amount, p_source, v_event_key);

  if v_acorn_amount > 0 then
    insert into public.acorn_transactions (user_id, amount, type, reason, event_key)
    values (
      p_user_id,
      v_acorn_amount,
      'earn',
      v_event_type,
      v_event_key || ':acorn'
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
    'member_id', p_member_id,
    'event_type', v_event_type,
    'event_key', v_event_key,
    'feed_id', v_feed_id,
    'title_ko', v_rule.display_name_ko,
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
  return public.post_growth_event(
    v_user_id,
    p_event_type,
    p_event_key,
    p_source,
    p_member_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. get_growth_profile — 성장 피드 (growth_events)
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
  v_feed jsonb;
  v_recent jsonb;
  v_reward_rules jsonb;
  v_tree_stages jsonb;
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

  select coalesce(jsonb_agg(row_to_json(r) order by r.event_type), '[]'::jsonb)
  into v_reward_rules
  from (
    select
      event_type,
      display_name_ko,
      growth_reward,
      acorn_reward,
      limit_period,
      limit_count
    from public.growth_reward_rules
    where is_active
    order by event_type
  ) r;

  select coalesce(jsonb_agg(row_to_json(s) order by s.sort_order), '[]'::jsonb)
  into v_tree_stages
  from (
    select stage_key, sort_order, min_growth, display_name_ko
    from public.growth_tree_stages
    where is_active
      and stage_key <> 'none'
    order by sort_order
  ) s;

  select coalesce(jsonb_agg(row_to_json(f) order by f.created_at desc), '[]'::jsonb)
  into v_feed
  from (
    select
      ge.id,
      ge.event_type,
      ge.event_key,
      ge.title_ko,
      ge.growth_amount,
      ge.acorn_amount,
      ge.source,
      ge.created_at
    from public.growth_events ge
    where ge.user_id = v_user_id
    order by ge.created_at desc
    limit 20
  ) f;

  select coalesce(jsonb_agg(row_to_json(t) order by t.created_at desc), '[]'::jsonb)
  into v_recent
  from (
    select
      ge.id,
      ge.event_type,
      ge.title_ko,
      ge.growth_amount,
      ge.acorn_amount,
      ge.source,
      ge.created_at
    from public.growth_events ge
    where ge.user_id = v_user_id
    order by ge.created_at desc
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
    'growth_feed', v_feed,
    'recent_growth', v_recent,
    'reward_rules', v_reward_rules,
    'tree_stages', v_tree_stages
  );
end;
$$;

grant execute on function public.post_growth_event(uuid, text, text, text, uuid) to anon, authenticated, service_role;
grant execute on function public.post_growth_event_for_member(uuid, text, text, text) to anon, authenticated, service_role;
grant execute on function public.get_growth_profile(uuid) to anon, authenticated, service_role;
