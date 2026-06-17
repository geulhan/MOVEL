-- MotionHub 센터 챌린지 (출석·운동일지·PT 완료)
-- migration_083 이후 실행

-- ---------------------------------------------------------------------------
-- 1. 센터 챌린지 마스터
-- ---------------------------------------------------------------------------

create table if not exists public.center_challenges (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  title text not null,
  description text not null default '',
  challenge_type text not null check (
    challenge_type in (
      'ATTENDANCE',
      'WORKOUT_LOG',
      'PT_SESSION',
      'BODY_COMPOSITION',
      'CUSTOM'
    )
  ),
  target_value integer not null check (target_value > 0),
  reward_growth integer not null default 0 check (reward_growth >= 0),
  reward_acorn integer not null default 0 check (reward_acorn >= 0),
  start_date date not null,
  end_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint center_challenges_date_range_check check (end_date >= start_date)
);

create index if not exists center_challenges_center_active_idx
  on public.center_challenges (center_id, is_active, start_date desc);

-- ---------------------------------------------------------------------------
-- 2. 회원 챌린지 진행도
-- ---------------------------------------------------------------------------

create table if not exists public.user_challenge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.platform_users (id) on delete cascade,
  challenge_id uuid not null references public.center_challenges (id) on delete cascade,
  current_value integer not null default 0 check (current_value >= 0),
  target_value integer not null check (target_value > 0),
  completed_at timestamptz,
  reward_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_challenge_progress_user_challenge_key unique (user_id, challenge_id)
);

create index if not exists user_challenge_progress_user_idx
  on public.user_challenge_progress (user_id, updated_at desc);

alter table public.center_challenges enable row level security;
alter table public.user_challenge_progress enable row level security;

drop policy if exists "center_challenges_all" on public.center_challenges;
create policy "center_challenges_all" on public.center_challenges
  for all using (true) with check (true);

drop policy if exists "user_challenge_progress_all" on public.user_challenge_progress;
create policy "user_challenge_progress_all" on public.user_challenge_progress
  for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 3. 알림 타입 확장 (챌린지 완료)
-- ---------------------------------------------------------------------------

alter table public.growth_notifications
  drop constraint if exists growth_notifications_notification_type_check;

alter table public.growth_notifications
  add constraint growth_notifications_notification_type_check
  check (notification_type in ('achievement', 'tree_stage', 'challenge'));

-- ---------------------------------------------------------------------------
-- 4. 챌린지 진행 지표 계산 (챌린지 기간·센터 범위)
-- ---------------------------------------------------------------------------

create or replace function public.compute_challenge_progress_value(
  p_user_id uuid,
  p_challenge_id uuid
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_challenge public.center_challenges%rowtype;
  v_count integer := 0;
  v_start_ts timestamptz;
  v_end_ts timestamptz;
begin
  select * into v_challenge
  from public.center_challenges
  where id = p_challenge_id;

  if not found then
    return 0;
  end if;

  v_start_ts := (v_challenge.start_date::timestamp at time zone 'Asia/Seoul');
  v_end_ts := ((v_challenge.end_date + 1)::timestamp at time zone 'Asia/Seoul');

  if v_challenge.challenge_type = 'ATTENDANCE' then
    select count(*)::integer into v_count
    from public.growth_events ge
    inner join public.members m on m.id = ge.member_id
    where ge.user_id = p_user_id
      and m.center_id = v_challenge.center_id
      and ge.event_type in ('PT_ATTENDANCE', 'GROUP_CLASS_ATTENDANCE')
      and ge.created_at >= v_start_ts
      and ge.created_at < v_end_ts;
  elsif v_challenge.challenge_type = 'WORKOUT_LOG' then
    select count(*)::integer into v_count
    from public.growth_events ge
    inner join public.members m on m.id = ge.member_id
    where ge.user_id = p_user_id
      and m.center_id = v_challenge.center_id
      and ge.event_type in ('WORKOUT_LOG', 'PHOTO_WORKOUT_LOG')
      and ge.created_at >= v_start_ts
      and ge.created_at < v_end_ts;
  elsif v_challenge.challenge_type = 'PT_SESSION' then
    select count(*)::integer into v_count
    from public.pt_schedules ps
    inner join public.platform_user_members pum
      on pum.member_id = ps.member_id
      and pum.user_id = p_user_id
    where ps.center_id = v_challenge.center_id
      and ps.status = 'completed'
      and ps.scheduled_at >= v_start_ts
      and ps.scheduled_at < v_end_ts;
  elsif v_challenge.challenge_type = 'BODY_COMPOSITION' then
    select count(*)::integer into v_count
    from public.member_inbody_records mir
    inner join public.platform_user_members pum
      on pum.member_id = mir.member_id
      and pum.user_id = p_user_id
    where mir.center_id = v_challenge.center_id
      and mir.measured_at >= v_start_ts
      and mir.measured_at < v_end_ts;
  else
    v_count := 0;
  end if;

  return coalesce(v_count, 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. 챌린지 완료 보상 + 알림
-- ---------------------------------------------------------------------------

create or replace function public.award_center_challenge_reward(
  p_user_id uuid,
  p_member_id uuid,
  p_challenge_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge public.center_challenges%rowtype;
  v_progress public.user_challenge_progress%rowtype;
  v_event_key text;
  v_ref_key text;
  v_total_before integer := 0;
  v_balance public.user_growth_balances%rowtype;
begin
  select * into v_challenge
  from public.center_challenges
  where id = p_challenge_id;

  if not found then
    return false;
  end if;

  select * into v_progress
  from public.user_challenge_progress ucp
  where ucp.user_id = p_user_id
    and ucp.challenge_id = p_challenge_id
  for update;

  if not found
    or v_progress.reward_claimed
    or coalesce(v_progress.current_value, 0) < v_progress.target_value
  then
    return false;
  end if;

  v_event_key := 'CENTER_CHALLENGE_' || p_challenge_id::text || '_' || p_user_id::text;

  if exists (
    select 1 from public.growth_events ge where ge.event_key = v_event_key
  ) then
    update public.user_challenge_progress
    set reward_claimed = true, updated_at = now()
    where id = v_progress.id;
    return true;
  end if;

  insert into public.user_growth_balances (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select coalesce(total_growth, 0) into v_total_before
  from public.user_growth_balances
  where user_id = p_user_id;

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
    'CHALLENGE_COMPLETE',
    v_event_key,
    v_challenge.title,
    v_challenge.reward_growth,
    v_challenge.reward_acorn,
    'center_challenge'
  );

  if v_challenge.reward_growth > 0 then
    insert into public.growth_transactions (
      user_id, event_type, amount, source, event_key
    )
    values (
      p_user_id,
      'CHALLENGE_COMPLETE',
      v_challenge.reward_growth,
      'center_challenge',
      v_event_key
    );
  end if;

  if v_challenge.reward_acorn > 0 then
    insert into public.acorn_transactions (
      user_id, amount, type, reason, event_key
    )
    values (
      p_user_id,
      v_challenge.reward_acorn,
      'earn',
      'CHALLENGE_COMPLETE',
      v_event_key || ':acorn'
    );
  end if;

  update public.user_growth_balances
  set
    total_growth = total_growth + v_challenge.reward_growth,
    current_acorns = current_acorns + v_challenge.reward_acorn,
    updated_at = now()
  where user_id = p_user_id
  returning * into v_balance;

  perform public.notify_growth_tree_stage_if_needed(
    p_user_id,
    p_member_id,
    v_total_before,
    v_balance.total_growth
  );

  v_ref_key := 'challenge:' || p_challenge_id::text || ':' || p_user_id::text;

  insert into public.growth_notifications (
    user_id,
    member_id,
    notification_type,
    title,
    body,
    icon,
    growth_amount,
    acorn_amount,
    reference_key
  )
  values (
    p_user_id,
    p_member_id,
    'challenge',
    '🎉 챌린지 완료',
    v_challenge.title,
    '🎯',
    v_challenge.reward_growth,
    v_challenge.reward_acorn,
    v_ref_key
  )
  on conflict (reference_key) do nothing;

  update public.user_challenge_progress
  set
    reward_claimed = true,
    completed_at = coalesce(completed_at, now()),
    updated_at = now()
  where id = v_progress.id;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. 회원 챌린지 진행도 동기화 + 자동 보상
-- ---------------------------------------------------------------------------

create or replace function public.sync_center_challenges_for_member(
  p_member_id uuid,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_center_id uuid;
  v_challenge public.center_challenges%rowtype;
  v_metric integer;
  v_progress public.user_challenge_progress%rowtype;
  v_completed jsonb := '[]'::jsonb;
  v_today date := (timezone('Asia/Seoul', now()))::date;
begin
  if p_member_id is null then
    return jsonb_build_object('ok', false, 'completed', v_completed);
  end if;

  v_user_id := coalesce(
    p_user_id,
    public.ensure_platform_user_for_member(p_member_id)
  );

  select m.center_id into v_center_id
  from public.members m
  where m.id = p_member_id;

  if v_center_id is null then
    return jsonb_build_object('ok', false, 'completed', v_completed);
  end if;

  for v_challenge in
    select *
    from public.center_challenges cc
    where cc.center_id = v_center_id
      and cc.is_active
      and v_today >= cc.start_date
      and v_today <= cc.end_date
      and cc.challenge_type in ('ATTENDANCE', 'WORKOUT_LOG', 'PT_SESSION')
    order by cc.end_date, cc.created_at
  loop
    v_metric := public.compute_challenge_progress_value(p_user_id, v_challenge.id);

    insert into public.user_challenge_progress (
      user_id,
      challenge_id,
      current_value,
      target_value
    )
    values (
      p_user_id,
      v_challenge.id,
      v_metric,
      v_challenge.target_value
    )
    on conflict (user_id, challenge_id) do update
    set
      current_value = excluded.current_value,
      target_value = excluded.target_value,
      completed_at = case
        when public.user_challenge_progress.completed_at is not null
          then public.user_challenge_progress.completed_at
        when excluded.current_value >= excluded.target_value then now()
        else null
      end,
      updated_at = now();

    if v_metric >= v_challenge.target_value then
      if public.award_center_challenge_reward(
        p_user_id,
        p_member_id,
        v_challenge.id
      ) then
        v_completed := v_completed || jsonb_build_array(
          jsonb_build_object(
            'challenge_id', v_challenge.id,
            'title', v_challenge.title
          )
        );
      end if;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'completed', v_completed);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. post_growth_event — 챌린지 진행도 연동
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
      select * into v_balance from public.user_growth_balances where user_id = p_user_id;
      return jsonb_build_object(
        'ok', true, 'duplicate', true, 'limit_reached', true,
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
      select * into v_balance from public.user_growth_balances where user_id = p_user_id;
      return jsonb_build_object(
        'ok', true, 'duplicate', true, 'limit_reached', true,
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

  select coalesce(total_growth, 0) into v_total_before
  from public.user_growth_balances
  where user_id = p_user_id;

  insert into public.growth_events (
    user_id, member_id, event_type, event_key, title_ko,
    growth_amount, acorn_amount, source
  )
  values (
    p_user_id, p_member_id, v_event_type, v_event_key, v_rule.display_name_ko,
    v_growth_amount, v_acorn_amount, p_source
  )
  returning id into v_feed_id;

  insert into public.growth_transactions (user_id, event_type, amount, source, event_key)
  values (p_user_id, v_event_type, v_growth_amount, p_source, v_event_key);

  if v_acorn_amount > 0 then
    insert into public.acorn_transactions (user_id, amount, type, reason, event_key)
    values (
      p_user_id, v_acorn_amount, 'earn', v_event_type, v_event_key || ':acorn'
    );
  end if;

  update public.user_growth_balances
  set
    total_growth = total_growth + v_growth_amount,
    current_acorns = current_acorns + v_acorn_amount,
    updated_at = now()
  where user_id = p_user_id
  returning * into v_balance;

  perform public.notify_growth_tree_stage_if_needed(
    p_user_id,
    p_member_id,
    v_total_before,
    v_balance.total_growth
  );

  v_achievements := public.evaluate_growth_achievements(p_user_id, p_member_id);

  if p_member_id is not null then
    v_challenges := public.sync_center_challenges_for_member(p_member_id, p_user_id);
  else
    v_challenges := '[]'::jsonb;
  end if;

  select * into v_balance from public.user_growth_balances where user_id = p_user_id;
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
    'tree', v_tree,
    'achievements_unlocked', v_achievements -> 'unlocked',
    'challenges_completed', v_challenges -> 'completed'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. get_growth_profile — 진행 중 챌린지 포함
-- ---------------------------------------------------------------------------

create or replace function public.get_growth_profile(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_center_id uuid;
  v_balance public.user_growth_balances%rowtype;
  v_mile integer := 0;
  v_tree jsonb;
  v_feed jsonb;
  v_timeline jsonb;
  v_notifications jsonb;
  v_unread_count integer := 0;
  v_achievements jsonb;
  v_active_challenges jsonb;
  v_reward_rules jsonb;
  v_tree_stages jsonb;
  v_today date := (timezone('Asia/Seoul', now()))::date;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);

  select m.center_id into v_center_id
  from public.members m
  where m.id = p_member_id;

  perform public.sync_center_challenges_for_member(p_member_id, v_user_id);

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

  select count(*)::integer into v_unread_count
  from public.growth_notifications gn
  where gn.user_id = v_user_id
    and gn.is_read is not true;

  select coalesce(jsonb_agg(row_to_json(r) order by r.event_type), '[]'::jsonb)
  into v_reward_rules
  from (
    select event_type, display_name_ko, growth_reward, acorn_reward, limit_period, limit_count
    from public.growth_reward_rules where is_active order by event_type
  ) r;

  select coalesce(jsonb_agg(row_to_json(s) order by s.sort_order), '[]'::jsonb)
  into v_tree_stages
  from (
    select stage_key, sort_order, min_growth, display_name_ko
    from public.growth_tree_stages
    where is_active and stage_key <> 'none'
    order by sort_order
  ) s;

  select coalesce(jsonb_agg(row_to_json(a) order by a.sort_order), '[]'::jsonb)
  into v_achievements
  from (
    select
      ga.id,
      ga.code,
      ga.title,
      ga.description,
      ga.icon,
      ga.metric_type,
      ga.target_value,
      ga.reward_growth,
      ga.reward_acorn,
      ga.sort_order,
      public.compute_growth_achievement_metric(v_user_id, ga.metric_type) as current_value,
      (uga.id is not null) as is_unlocked,
      uga.unlocked_at
    from public.growth_achievements ga
    left join public.user_growth_achievements uga
      on uga.user_id = v_user_id
      and uga.achievement_code = ga.code
    where ga.is_active
    order by ga.sort_order
  ) a;

  select coalesce(jsonb_agg(row_to_json(c) order by c.end_date, c.title), '[]'::jsonb)
  into v_active_challenges
  from (
    select
      cc.id,
      cc.title,
      cc.description,
      cc.challenge_type,
      cc.target_value,
      cc.reward_growth,
      cc.reward_acorn,
      cc.start_date,
      cc.end_date,
      coalesce(ucp.current_value, 0) as current_value,
      coalesce(ucp.target_value, cc.target_value) as progress_target,
      ucp.completed_at,
      coalesce(ucp.reward_claimed, false) as reward_claimed,
      (coalesce(ucp.current_value, 0) >= cc.target_value) as is_completed
    from public.center_challenges cc
    left join public.user_challenge_progress ucp
      on ucp.challenge_id = cc.id
      and ucp.user_id = v_user_id
    where cc.center_id = v_center_id
      and cc.is_active
      and v_today >= cc.start_date
      and v_today <= cc.end_date
      and cc.challenge_type in ('ATTENDANCE', 'WORKOUT_LOG', 'PT_SESSION')
    order by cc.end_date, cc.title
  ) c;

  select coalesce(jsonb_agg(row_to_json(f) order by f.created_at desc), '[]'::jsonb)
  into v_feed
  from (
    select ge.id, ge.event_type, ge.event_key, ge.title_ko,
           ge.growth_amount, ge.acorn_amount, ge.source, ge.created_at
    from public.growth_events ge
    where ge.user_id = v_user_id
    order by ge.created_at desc
    limit 20
  ) f;

  select coalesce(jsonb_agg(row_to_json(n) order by n.created_at desc), '[]'::jsonb)
  into v_notifications
  from (
    select gn.id, gn.notification_type, gn.title, gn.body, gn.icon,
           gn.growth_amount, gn.acorn_amount, gn.is_read, gn.created_at
    from public.growth_notifications gn
    where gn.user_id = v_user_id
    order by gn.created_at desc
    limit 10
  ) n;

  select coalesce(jsonb_agg(row_to_json(t) order by t.created_at desc), '[]'::jsonb)
  into v_timeline
  from (
    select
      id,
      kind,
      title,
      subtitle,
      icon,
      growth_amount,
      acorn_amount,
      created_at
    from (
      select
        ge.id::text as id,
        'activity'::text as kind,
        ge.title_ko as title,
        null::text as subtitle,
        null::text as icon,
        ge.growth_amount,
        ge.acorn_amount,
        ge.created_at
      from public.growth_events ge
      where ge.user_id = v_user_id
      union all
      select
        gn.id::text,
        gn.notification_type,
        gn.title,
        gn.body,
        gn.icon,
        gn.growth_amount,
        gn.acorn_amount,
        gn.created_at
      from public.growth_notifications gn
      where gn.user_id = v_user_id
    ) combined
    order by created_at desc
    limit 30
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
    'recent_growth', v_feed,
    'growth_timeline', v_timeline,
    'growth_notifications', v_notifications,
    'unread_notification_count', v_unread_count,
    'achievements', v_achievements,
    'active_challenges', v_active_challenges,
    'reward_rules', v_reward_rules,
    'tree_stages', v_tree_stages
  );
end;
$$;

grant execute on function public.compute_challenge_progress_value(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.award_center_challenge_reward(uuid, uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.sync_center_challenges_for_member(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.post_growth_event(uuid, text, text, text, uuid) to anon, authenticated, service_role;
grant execute on function public.get_growth_profile(uuid) to anon, authenticated, service_role;
