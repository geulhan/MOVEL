-- MotionHub 성장 업적 + 앱 내 알림 + 타임라인
-- migration_081 이후 실행

-- ---------------------------------------------------------------------------
-- 1. 업적 마스터
-- ---------------------------------------------------------------------------

create table if not exists public.growth_achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  icon text not null default '🏅',
  metric_type text not null check (
    metric_type in ('attendance_count', 'workout_log_count', 'streak_days')
  ),
  target_value integer not null check (target_value > 0),
  reward_growth integer not null default 0 check (reward_growth >= 0),
  reward_acorn integer not null default 0 check (reward_acorn >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. 회원 보유 업적
-- ---------------------------------------------------------------------------

create table if not exists public.user_growth_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.platform_users (id) on delete cascade,
  achievement_id uuid not null references public.growth_achievements (id) on delete cascade,
  achievement_code text not null,
  unlocked_at timestamptz not null default now(),
  constraint user_growth_achievements_user_code_key unique (user_id, achievement_code)
);

create index if not exists user_growth_achievements_user_idx
  on public.user_growth_achievements (user_id, unlocked_at desc);

-- ---------------------------------------------------------------------------
-- 3. 앱 내 성장 알림
-- ---------------------------------------------------------------------------

create table if not exists public.growth_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.platform_users (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  notification_type text not null check (
    notification_type in ('achievement', 'tree_stage')
  ),
  title text not null,
  body text,
  icon text not null default '🎉',
  growth_amount integer not null default 0 check (growth_amount >= 0),
  acorn_amount integer not null default 0 check (acorn_amount >= 0),
  is_read boolean not null default false,
  reference_key text not null,
  created_at timestamptz not null default now(),
  constraint growth_notifications_reference_key_key unique (reference_key)
);

create index if not exists growth_notifications_user_created_idx
  on public.growth_notifications (user_id, created_at desc);

create index if not exists growth_notifications_user_unread_idx
  on public.growth_notifications (user_id, is_read)
  where is_read is not true;

alter table public.growth_achievements enable row level security;
alter table public.user_growth_achievements enable row level security;
alter table public.growth_notifications enable row level security;

drop policy if exists "growth_achievements_read" on public.growth_achievements;
create policy "growth_achievements_read" on public.growth_achievements
  for select using (true);

drop policy if exists "user_growth_achievements_all" on public.user_growth_achievements;
create policy "user_growth_achievements_all" on public.user_growth_achievements
  for all using (true) with check (true);

drop policy if exists "growth_notifications_all" on public.growth_notifications;
create policy "growth_notifications_all" on public.growth_notifications
  for all using (true) with check (true);

insert into public.growth_achievements (
  code, title, description, icon, metric_type, target_value,
  reward_growth, reward_acorn, sort_order
)
values
  (
    'FIRST_ATTENDANCE',
    '첫 출석',
    '처음 운동을 완료했습니다.',
    '🎯',
    'attendance_count',
    1,
    30,
    1,
    1
  ),
  (
    'ATTENDANCE_10',
    '10회 출석',
    '출석 10회를 달성했습니다.',
    '🏅',
    'attendance_count',
    10,
    100,
    5,
    2
  ),
  (
    'ATTENDANCE_30',
    '30회 출석',
    '출석 30회를 달성했습니다.',
    '🥇',
    'attendance_count',
    30,
    200,
    10,
    3
  ),
  (
    'ATTENDANCE_100',
    '100회 출석',
    '출석 100회를 달성했습니다.',
    '👑',
    'attendance_count',
    100,
    500,
    25,
    4
  ),
  (
    'WORKOUT_LOG_10',
    '운동일지 10회 작성',
    '운동일지를 10번 작성했습니다.',
    '📝',
    'workout_log_count',
    10,
    80,
    5,
    5
  ),
  (
    'STREAK_7',
    '7일 연속 출석',
    '7일 연속으로 운동했습니다.',
    '🔥',
    'streak_days',
    7,
    100,
    5,
    6
  ),
  (
    'STREAK_30',
    '30일 연속 출석',
    '30일 연속으로 운동했습니다.',
    '💎',
    'streak_days',
    30,
    300,
    15,
    7
  )
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  metric_type = excluded.metric_type,
  target_value = excluded.target_value,
  reward_growth = excluded.reward_growth,
  reward_acorn = excluded.reward_acorn,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- ---------------------------------------------------------------------------
-- 4. 업적 지표 계산
-- ---------------------------------------------------------------------------

create or replace function public.compute_growth_achievement_metric(
  p_user_id uuid,
  p_metric_type text
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_streak integer := 0;
  v_today date := (timezone('Asia/Seoul', now()))::date;
  v_cursor date;
  v_has_day boolean;
begin
  if p_metric_type = 'attendance_count' then
    select count(*)::integer into v_count
    from public.growth_events ge
    where ge.user_id = p_user_id
      and ge.event_type in ('PT_ATTENDANCE', 'GROUP_CLASS_ATTENDANCE');
    return coalesce(v_count, 0);
  end if;

  if p_metric_type = 'workout_log_count' then
    select count(*)::integer into v_count
    from public.growth_events ge
    where ge.user_id = p_user_id
      and ge.event_type in ('WORKOUT_LOG', 'PHOTO_WORKOUT_LOG');
    return coalesce(v_count, 0);
  end if;

  if p_metric_type = 'streak_days' then
    if not exists (
      select 1
      from public.growth_events ge
      where ge.user_id = p_user_id
        and (timezone('Asia/Seoul', ge.created_at))::date = v_today
        and ge.event_type in ('PT_ATTENDANCE', 'GROUP_CLASS_ATTENDANCE', 'STREAK_7_DAYS', 'STREAK_30_DAYS')
    ) then
      return 0;
    end if;

    v_cursor := v_today;
    loop
      select exists (
        select 1
        from public.platform_user_members pum
        inner join public.attendance_logs al on al.member_id = pum.member_id
        where pum.user_id = p_user_id
          and (timezone('Asia/Seoul', al.checked_in_at))::date = v_cursor
        union all
        select 1
        from public.platform_user_members pum
        inner join public.class_attendance ca on ca.member_id = pum.member_id
        where pum.user_id = p_user_id
          and ca.status = 'attended'
          and (timezone('Asia/Seoul', ca.checked_at))::date = v_cursor
      ) into v_has_day;

      exit when not coalesce(v_has_day, false);
      v_streak := v_streak + 1;
      v_cursor := v_cursor - 1;
      exit when v_streak >= 60;
    end loop;

    return v_streak;
  end if;

  return 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. 업적 판정 + 보상 + 알림
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
    select *
    from public.growth_achievements ga
    where ga.is_active
    order by ga.sort_order, ga.target_value
  loop
    if exists (
      select 1
      from public.user_growth_achievements uga
      where uga.user_id = p_user_id
        and uga.achievement_code = v_achievement.code
    ) then
      continue;
    end if;

    v_metric := public.compute_growth_achievement_metric(
      p_user_id,
      v_achievement.metric_type
    );

    if v_metric < v_achievement.target_value then
      continue;
    end if;

    insert into public.user_growth_achievements (
      user_id,
      achievement_id,
      achievement_code
    )
    values (
      p_user_id,
      v_achievement.id,
      v_achievement.code
    );

    if v_achievement.reward_growth > 0 or v_achievement.reward_acorn > 0 then
      insert into public.user_growth_balances (user_id)
      values (p_user_id)
      on conflict (user_id) do nothing;

      update public.user_growth_balances
      set
        total_growth = total_growth + v_achievement.reward_growth,
        current_acorns = current_acorns + v_achievement.reward_acorn,
        updated_at = now()
      where user_id = p_user_id;

      if v_achievement.reward_growth > 0 then
        insert into public.growth_transactions (
          user_id, event_type, amount, source, event_key
        )
        values (
          p_user_id,
          'ACHIEVEMENT',
          v_achievement.reward_growth,
          'achievement',
          'achievement:' || v_achievement.code
        )
        on conflict do nothing;
      end if;

      if v_achievement.reward_acorn > 0 then
        insert into public.acorn_transactions (
          user_id, amount, type, reason, event_key
        )
        values (
          p_user_id,
          v_achievement.reward_acorn,
          'earn',
          'ACHIEVEMENT',
          'achievement:' || v_achievement.code || ':acorn'
        )
        on conflict do nothing;
      end if;
    end if;

    v_ref_key := 'achievement:' || v_achievement.code || ':' || p_user_id::text;

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
      'achievement',
      '🎉 업적 달성',
      v_achievement.title,
      v_achievement.icon,
      v_achievement.reward_growth,
      v_achievement.reward_acorn,
      v_ref_key
    )
    on conflict (reference_key) do nothing;

    v_newly_unlocked := v_newly_unlocked || jsonb_build_array(
      jsonb_build_object(
        'code', v_achievement.code,
        'title', v_achievement.title,
        'reward_growth', v_achievement.reward_growth,
        'reward_acorn', v_achievement.reward_acorn
      )
    );
  end loop;

  return jsonb_build_object('unlocked', v_newly_unlocked);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. 운동나무 단계 알림
-- ---------------------------------------------------------------------------

create or replace function public.notify_growth_tree_stage_if_needed(
  p_user_id uuid,
  p_member_id uuid,
  p_total_growth_before integer,
  p_total_growth_after integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_stage_key text;
  v_stage_name text;
  v_ref_key text;
begin
  v_before := public.compute_growth_tree_stage(greatest(0, coalesce(p_total_growth_before, 0)));
  v_after := public.compute_growth_tree_stage(greatest(0, coalesce(p_total_growth_after, 0)));

  v_stage_key := v_after ->> 'current_stage_key';
  v_stage_name := v_after ->> 'current_stage_name';

  if v_stage_key is null or v_stage_key in ('none', 'seed') then
    return;
  end if;

  if (v_before ->> 'current_stage_key') = v_stage_key then
    return;
  end if;

  v_ref_key := 'tree_stage:' || v_stage_key || ':' || p_user_id::text;

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
    'tree_stage',
    '🎉 운동나무 성장',
    v_stage_name || ' 단계가 되었습니다.',
    case v_stage_key
      when 'sprout' then '🌿'
      when 'small' then '🌳'
      when 'large' then '🌲'
      when 'sakura' then '🌸'
      else '🌱'
    end,
    0,
    0,
    v_ref_key
  )
  on conflict (reference_key) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. post_growth_event — 업적·단계 알림 연동
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
    'achievements_unlocked', v_achievements -> 'unlocked'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. 알림 읽음 처리
-- ---------------------------------------------------------------------------

create or replace function public.mark_growth_notifications_read(
  p_member_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_count integer;
begin
  v_user_id := public.ensure_platform_user_for_member(p_member_id);

  update public.growth_notifications
  set is_read = true
  where user_id = v_user_id
    and is_read is not true;

  get diagnostics v_count = row_count;

  return jsonb_build_object('ok', true, 'marked_read', v_count);
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. get_growth_profile — 업적·알림·타임라인
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
  v_timeline jsonb;
  v_notifications jsonb;
  v_unread_count integer := 0;
  v_achievements jsonb;
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
    'reward_rules', v_reward_rules,
    'tree_stages', v_tree_stages
  );
end;
$$;

grant execute on function public.compute_growth_achievement_metric(uuid, text) to anon, authenticated, service_role;
grant execute on function public.evaluate_growth_achievements(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.notify_growth_tree_stage_if_needed(uuid, uuid, integer, integer) to anon, authenticated, service_role;
grant execute on function public.mark_growth_notifications_read(uuid) to anon, authenticated, service_role;
grant execute on function public.post_growth_event(uuid, text, text, text, uuid) to anon, authenticated, service_role;
grant execute on function public.get_growth_profile(uuid) to anon, authenticated, service_role;
