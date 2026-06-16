-- 승인된 걸음 인증인데 리워드 적립이 누락된 건 보정
-- center_id 버그로 awardStepRewardsFromVerification이 실패했던 경우

do $$
declare
  v record;
  v_rules jsonb;
  v_score int;
  v_mile int;
  v_balance_score int;
  v_balance_mile int;
  v_event_base text;
  v_txn_id uuid;
  v_expires_at timestamptz;
  v_tier text;
  v_min_steps int;
begin
  select setting_value
  into v_rules
  from public.reward_settings
  where setting_key = 'earn_rules'
    and branch_id is null
  order by updated_at desc
  limit 1;

  if v_rules is null then
    v_rules := '{
      "steps_7000": {"score": 10, "mile": 300},
      "steps_10000": {"score": 15, "mile": 500},
      "steps_15000": {"score": 20, "mile": 700}
    }'::jsonb;
  end if;

  for v in
    select
      sv.id,
      sv.member_id,
      sv.verification_date,
      sv.extracted_step_count,
      m.center_id
    from public.step_verifications sv
    join public.members m on m.id = sv.member_id
    where sv.status = 'approved'
      and coalesce(sv.extracted_step_count, 0) >= 7000
      and not exists (
        select 1
        from public.reward_transactions rt
        where rt.member_id = sv.member_id
          and rt.reference_id = sv.id
          and rt.reference_type = 'step_verifications'
      )
  loop
    insert into public.reward_balances (
      member_id,
      center_id,
      move_score,
      move_mile,
      updated_at
    )
    values (v.member_id, v.center_id, 0, 0, now())
    on conflict (member_id) do nothing;

    insert into public.member_daily_activity (
      member_id,
      center_id,
      activity_date,
      step_count,
      has_pt_attendance,
      has_journal,
      step_source,
      updated_at
    )
    values (
      v.member_id,
      v.center_id,
      v.verification_date,
      v.extracted_step_count,
      false,
      false,
      'ocr_verification',
      now()
    )
    on conflict (member_id, activity_date) do update
      set step_count = greatest(public.member_daily_activity.step_count, excluded.step_count),
          center_id = excluded.center_id,
          step_source = 'ocr_verification',
          updated_at = now();

    select move_score, move_mile
    into v_balance_score, v_balance_mile
    from public.reward_balances
    where member_id = v.member_id
    for update;

    foreach v_tier in array array['steps_7000', 'steps_10000', 'steps_15000']
    loop
      v_min_steps := case v_tier
        when 'steps_7000' then 7000
        when 'steps_10000' then 10000
        else 15000
      end;

      if v.extracted_step_count < v_min_steps then
        continue;
      end if;

      v_event_base := v_tier || ':' || v.member_id::text || ':' || v.verification_date::text;

      if exists (
        select 1
        from public.reward_transactions
        where member_id = v.member_id
          and event_key = v_event_base || ':score'
      ) then
        continue;
      end if;

      v_score := coalesce((v_rules -> v_tier ->> 'score')::int, 0);
      v_mile := coalesce((v_rules -> v_tier ->> 'mile')::int, 0);

      if v_score > 0 then
        v_balance_score := v_balance_score + v_score;
        insert into public.reward_transactions (
          member_id,
          center_id,
          currency,
          amount,
          balance_after,
          event_type,
          event_key,
          reference_type,
          reference_id,
          note,
          created_by
        )
        values (
          v.member_id,
          v.center_id,
          'move_score',
          v_score,
          v_balance_score,
          v_tier,
          v_event_base || ':score',
          'step_verifications',
          v.id,
          '걸음 OCR 인증 보정 ' || v_min_steps::text || '보',
          'migration_061'
        );
      end if;

      if v_mile > 0 then
        v_balance_mile := v_balance_mile + v_mile;
        v_expires_at := now() + interval '12 months';
        insert into public.reward_transactions (
          member_id,
          center_id,
          currency,
          amount,
          balance_after,
          event_type,
          event_key,
          reference_type,
          reference_id,
          note,
          expires_at,
          created_by
        )
        values (
          v.member_id,
          v.center_id,
          'move_mile',
          v_mile,
          v_balance_mile,
          v_tier,
          v_event_base || ':mile',
          'step_verifications',
          v.id,
          '걸음 OCR 인증 보정 ' || v_min_steps::text || '보',
          v_expires_at,
          'migration_061'
        )
        returning id into v_txn_id;

        insert into public.reward_mile_lots (
          member_id,
          center_id,
          source_transaction_id,
          earned_amount,
          remaining_amount,
          expires_at
        )
        values (
          v.member_id,
          v.center_id,
          v_txn_id,
          v_mile,
          v_mile,
          v_expires_at
        );
      end if;
    end loop;

    update public.reward_balances
    set move_score = v_balance_score,
        move_mile = v_balance_mile,
        center_id = v.center_id,
        updated_at = now()
    where member_id = v.member_id;
  end loop;
end;
$$;
