-- 걸음 구간 확대(3k~15k) + 성장 업적·적립 규칙 확장
-- migration_088 이후 실행

-- ---------------------------------------------------------------------------
-- 1. 업적 metric_type 확장
-- ---------------------------------------------------------------------------

alter table public.growth_achievements
  drop constraint if exists growth_achievements_metric_type_check;

alter table public.growth_achievements
  add constraint growth_achievements_metric_type_check check (
    metric_type in (
      'attendance_count',
      'workout_log_count',
      'streak_days',
      'max_step_verification',
      'step_verification_count',
      'facility_checkin_count',
      'center_photo_count',
      'group_class_count'
    )
  );

-- ---------------------------------------------------------------------------
-- 2. 업적 지표 계산 확장
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

  if p_metric_type = 'group_class_count' then
    select count(*)::integer into v_count
    from public.growth_events ge
    where ge.user_id = p_user_id
      and ge.event_type = 'GROUP_CLASS_ATTENDANCE';
    return coalesce(v_count, 0);
  end if;

  if p_metric_type = 'max_step_verification' then
    select coalesce(max(sv.extracted_step_count), 0)::integer into v_count
    from public.platform_user_members pum
    inner join public.step_verifications sv on sv.member_id = pum.member_id
    where pum.user_id = p_user_id
      and sv.status = 'approved'
      and coalesce(sv.extracted_step_count, 0) > 0;
    return coalesce(v_count, 0);
  end if;

  if p_metric_type = 'step_verification_count' then
    select count(*)::integer into v_count
    from public.platform_user_members pum
    inner join public.step_verifications sv on sv.member_id = pum.member_id
    where pum.user_id = p_user_id
      and sv.status = 'approved';
    return coalesce(v_count, 0);
  end if;

  if p_metric_type = 'facility_checkin_count' then
    select count(*)::integer into v_count
    from public.platform_user_members pum
    inner join public.facility_checkins fc on fc.member_id = pum.member_id
    where pum.user_id = p_user_id;
    return coalesce(v_count, 0);
  end if;

  if p_metric_type = 'center_photo_count' then
    select count(*)::integer into v_count
    from public.platform_user_members pum
    inner join public.center_photo_submissions cps on cps.member_id = pum.member_id
    where pum.user_id = p_user_id
      and cps.status = 'approved';
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
-- 3. 성장 업적 시드 (걸음 · 출석 · 센터 인증 등)
-- ---------------------------------------------------------------------------

insert into public.growth_achievements (
  code, title, description, icon, metric_type, target_value,
  reward_growth, reward_acorn, sort_order
)
values
  ('STEPS_PEAK_3000', '3,000보 돌파', '걸음 인증에서 3,000보를 달성했습니다.', '👟', 'max_step_verification', 3000, 20, 2, 10),
  ('STEPS_PEAK_5000', '5,000보 돌파', '걸음 인증에서 5,000보를 달성했습니다.', '👟', 'max_step_verification', 5000, 35, 3, 11),
  ('STEPS_PEAK_7000', '7,000보 돌파', '걸음 인증에서 7,000보를 달성했습니다.', '🚶', 'max_step_verification', 7000, 50, 5, 12),
  ('STEPS_PEAK_10000', '10,000보 돌파', '걸음 인증에서 10,000보를 달성했습니다.', '🏃', 'max_step_verification', 10000, 80, 8, 13),
  ('STEPS_PEAK_15000', '15,000보 돌파', '걸음 인증에서 15,000보를 달성했습니다.', '🔥', 'max_step_verification', 15000, 120, 12, 14),
  ('STEPS_VERIFY_5', '걸음 인증 5회', '걸음 인증을 5회 완료했습니다.', '📱', 'step_verification_count', 5, 40, 4, 15),
  ('STEPS_VERIFY_20', '걸음 인증 20회', '걸음 인증을 20회 완료했습니다.', '📱', 'step_verification_count', 20, 120, 10, 16),
  ('STEPS_VERIFY_50', '걸음 인증 50회', '걸음 인증을 50회 완료했습니다.', '🏆', 'step_verification_count', 50, 250, 20, 17),
  ('ATTENDANCE_50', '50회 출석', '출석 50회를 달성했습니다.', '🎖️', 'attendance_count', 50, 300, 15, 18),
  ('GROUP_CLASS_5', '그룹수업 5회', '그룹수업을 5회 완료했습니다.', '🧘', 'group_class_count', 5, 60, 5, 19),
  ('GROUP_CLASS_20', '그룹수업 20회', '그룹수업을 20회 완료했습니다.', '🧘', 'group_class_count', 20, 180, 12, 20),
  ('FACILITY_5', '센터 출입 5회', '센터 출입을 5회 인증했습니다.', '🚪', 'facility_checkin_count', 5, 40, 3, 21),
  ('FACILITY_20', '센터 출입 20회', '센터 출입을 20회 인증했습니다.', '🚪', 'facility_checkin_count', 20, 150, 10, 22),
  ('CENTER_PHOTO_1', '센터 인증 1회', '센터 사진 인증을 처음 완료했습니다.', '📸', 'center_photo_count', 1, 30, 2, 23),
  ('CENTER_PHOTO_10', '센터 인증 10회', '센터 사진 인증을 10회 완료했습니다.', '📸', 'center_photo_count', 10, 120, 8, 24),
  ('WORKOUT_LOG_30', '운동일지 30회 작성', '운동일지를 30번 작성했습니다.', '📓', 'workout_log_count', 30, 150, 10, 25),
  ('STREAK_14', '14일 연속 출석', '14일 연속으로 운동했습니다.', '⚡', 'streak_days', 14, 180, 10, 26)
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
-- 4. 마일리지 적립 규칙 — 걸음 구간 3k~15k 병합
-- ---------------------------------------------------------------------------

update public.reward_settings
set
  setting_value = coalesce(setting_value, '{}'::jsonb)
    || jsonb_build_object(
      'steps_3000', jsonb_build_object('score', 5, 'mile', 100),
      'steps_5000', jsonb_build_object('score', 8, 'mile', 200),
      'steps_7000', jsonb_build_object('score', 10, 'mile', 300),
      'steps_10000', jsonb_build_object('score', 15, 'mile', 500),
      'steps_15000', jsonb_build_object('score', 25, 'mile', 800)
    ),
  updated_at = now()
where setting_key = 'earn_rules'
  and branch_id is null;

insert into public.reward_settings (branch_id, setting_key, setting_value, description)
select
  null,
  'earn_rules',
  jsonb_build_object(
    'pt_attendance', jsonb_build_object('score', 20, 'mile', 500),
    'steps_3000', jsonb_build_object('score', 5, 'mile', 100),
    'steps_5000', jsonb_build_object('score', 8, 'mile', 200),
    'steps_7000', jsonb_build_object('score', 10, 'mile', 300),
    'steps_10000', jsonb_build_object('score', 15, 'mile', 500),
    'steps_15000', jsonb_build_object('score', 25, 'mile', 800),
    'exercise_journal', jsonb_build_object('score', 5, 'mile', 100),
    'streak_7day', jsonb_build_object('score', 50, 'mile', 3000),
    'naver_review', jsonb_build_object('score', 0, 'mile', 10000),
    'center_photo', jsonb_build_object('score', 20, 'mile', 500),
    'referral_percent', 10,
    'custom_rules', '[]'::jsonb
  ),
  'MOVE SCORE · MILE 적립 규칙'
where not exists (
  select 1 from public.reward_settings
  where setting_key = 'earn_rules' and branch_id is null
);

grant execute on function public.compute_growth_achievement_metric(uuid, text)
  to anon, authenticated, service_role;
