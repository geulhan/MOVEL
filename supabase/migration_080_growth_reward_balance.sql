-- MotionHub 성장 보상 밸런스 조정 + growth_reward_rules
-- migration_078 이후 실행

-- ---------------------------------------------------------------------------
-- 1. 보상 규칙 테이블
-- ---------------------------------------------------------------------------

create table if not exists public.growth_reward_rules (
  event_type text primary key,
  display_name_ko text not null,
  growth_reward integer not null default 0 check (growth_reward >= 0),
  acorn_reward integer not null default 0 check (acorn_reward >= 0),
  limit_period text not null default 'none'
    check (limit_period in ('none', 'monthly')),
  limit_count integer check (limit_count is null or limit_count > 0),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.growth_reward_rules enable row level security;

drop policy if exists "growth_reward_rules_read" on public.growth_reward_rules;
create policy "growth_reward_rules_read" on public.growth_reward_rules
  for select using (true);

insert into public.growth_reward_rules (
  event_type,
  display_name_ko,
  growth_reward,
  acorn_reward,
  limit_period,
  limit_count
)
values
  ('PT_ATTENDANCE', 'PT 출석', 30, 1, 'none', null),
  ('GROUP_CLASS_ATTENDANCE', '그룹수업 출석', 20, 1, 'none', null),
  ('WORKOUT_LOG', '운동일지 작성', 10, 1, 'none', null),
  ('PHOTO_WORKOUT_LOG', '사진 포함 운동일지', 15, 1, 'none', null),
  ('BODY_COMPOSITION', '체성분 측정', 50, 3, 'monthly', 1),
  ('CHALLENGE_COMPLETE', '센터 챌린지 완료', 100, 5, 'none', null),
  ('STREAK_7_DAYS', '7일 연속 출석', 150, 10, 'none', null),
  ('STREAK_30_DAYS', '30일 연속 출석', 500, 30, 'none', null)
on conflict (event_type) do update set
  display_name_ko = excluded.display_name_ko,
  growth_reward = excluded.growth_reward,
  acorn_reward = excluded.acorn_reward,
  limit_period = excluded.limit_period,
  limit_count = excluded.limit_count,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2. 운동나무 단계 (성장치 기준 상향)
-- ---------------------------------------------------------------------------

insert into public.growth_tree_stages (stage_key, sort_order, min_growth, display_name_ko)
values
  ('none', 0, 0, '시작 전'),
  ('seed', 1, 100, '씨앗'),
  ('sprout', 2, 500, '새싹'),
  ('small', 3, 1500, '어린 나무'),
  ('large', 4, 5000, '큰 나무'),
  ('sakura', 5, 15000, '벚꽃나무')
on conflict (stage_key) do update set
  sort_order = excluded.sort_order,
  min_growth = excluded.min_growth,
  display_name_ko = excluded.display_name_ko;

-- ---------------------------------------------------------------------------
-- 3. post_growth_event — growth_reward_rules 참조
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
  v_event_type text;
  v_rule public.growth_reward_rules%rowtype;
  v_growth_amount integer := 0;
  v_acorn_amount integer := 0;
  v_event_key text := nullif(trim(coalesce(p_event_key, '')), '');
  v_existing uuid;
  v_month_count integer := 0;
  v_balance public.user_growth_balances%rowtype;
  v_tree jsonb;
begin
  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED';
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

  if v_rule.limit_period = 'monthly' and coalesce(v_rule.limit_count, 0) > 0 then
    if v_event_key is null then
      v_event_key := lower(v_event_type) || ':' || to_char(
        timezone('Asia/Seoul', now()),
        'YYYY-MM'
      );
    end if;

    select count(*)::integer into v_month_count
    from public.growth_transactions gt
    where gt.user_id = p_user_id
      and gt.event_type = v_event_type
      and gt.created_at >= date_trunc(
        'month',
        timezone('Asia/Seoul', now()) at time zone 'Asia/Seoul'
      );

    if v_month_count >= v_rule.limit_count then
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
  values (p_user_id, v_event_type, v_growth_amount, p_source, v_event_key);

  if v_acorn_amount > 0 then
    insert into public.acorn_transactions (user_id, amount, type, reason, event_key)
    values (
      p_user_id,
      v_acorn_amount,
      'earn',
      v_event_type,
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
    'event_type', v_event_type,
    'growth_awarded', v_growth_amount,
    'acorns_awarded', v_acorn_amount,
    'total_growth', v_balance.total_growth,
    'current_acorns', v_balance.current_acorns,
    'tree', v_tree
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. get_growth_profile — 보상 규칙·단계 목록 포함
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
    'recent_growth', v_recent,
    'reward_rules', v_reward_rules,
    'tree_stages', v_tree_stages
  );
end;
$$;

grant execute on function public.post_growth_event(uuid, text, text, text) to anon, authenticated, service_role;
grant execute on function public.get_growth_profile(uuid) to anon, authenticated, service_role;
