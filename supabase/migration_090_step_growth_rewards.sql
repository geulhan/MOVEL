-- 걸음 구간 보상 분리: 마일리지는 7k/10k/15k 유지, 3k~15k는 성장치·도토리
-- migration_089에서 추가된 steps_3000/steps_5000 마일리지 키 제거

-- ---------------------------------------------------------------------------
-- 1. 마일리지 earn_rules — 7k/10k/15k만 유지 (현행 값)
-- ---------------------------------------------------------------------------

update public.reward_settings
set
  setting_value = (
    coalesce(setting_value, '{}'::jsonb)
    - 'steps_3000'
    - 'steps_5000'
  )
  || jsonb_build_object(
    'steps_7000', jsonb_build_object('score', 10, 'mile', 300),
    'steps_10000', jsonb_build_object('score', 15, 'mile', 500),
    'steps_15000', jsonb_build_object('score', 20, 'mile', 700)
  ),
  updated_at = now()
where setting_key = 'earn_rules'
  and branch_id is null;

-- ---------------------------------------------------------------------------
-- 2. 걸음 구간 성장·도토리 규칙 (하루 1회, event_key 중복 방지)
-- ---------------------------------------------------------------------------

insert into public.growth_reward_rules (
  event_type,
  display_name_ko,
  growth_reward,
  acorn_reward,
  limit_period,
  limit_count
)
values
  ('STEPS_3000', '3,000보 달성', 5, 1, 'none', null),
  ('STEPS_5000', '5,000보 달성', 8, 1, 'none', null),
  ('STEPS_7000', '7,000보 달성', 10, 2, 'none', null),
  ('STEPS_10000', '10,000보 달성', 15, 3, 'none', null),
  ('STEPS_15000', '15,000보 달성', 25, 5, 'none', null)
on conflict (event_type) do update set
  display_name_ko = excluded.display_name_ko,
  growth_reward = excluded.growth_reward,
  acorn_reward = excluded.acorn_reward,
  limit_period = excluded.limit_period,
  limit_count = excluded.limit_count,
  is_active = true,
  updated_at = now();
