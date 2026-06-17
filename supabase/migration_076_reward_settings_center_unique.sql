-- reward_settings: 센터별 설정 unique index 정리
-- branch_id IS NULL 전역 unique index가 멀티 센터 insert 를 막는 문제 수정
-- Supabase SQL Editor에서 실행

drop index if exists public.reward_settings_global_key_uidx;

-- 센터별 설정: center_id + setting_key 당 1건
create unique index if not exists reward_settings_center_setting_key_uidx
  on public.reward_settings (center_id, setting_key);

-- 레거시 전역 설정(earn_rules 등): center_id 없는 행만
create unique index if not exists reward_settings_global_key_uidx
  on public.reward_settings (setting_key)
  where branch_id is null and center_id is null;

-- 기존 센터 설정 행: branch_id null → center_id 로 채워 전역 index 대상에서 제외
update public.reward_settings
set branch_id = center_id
where center_id is not null
  and branch_id is null
  and setting_key not in ('earn_rules', 'redemption');
