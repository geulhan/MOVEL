-- reward_settings: 센터별 설정 unique index 정리
-- branch_id IS NULL 전역 unique index가 멀티 센터 insert 를 막는 문제 수정
-- Supabase SQL Editor에서 실행
--
-- 주의: branch_id 는 branches(id) FK 이므로 center_id 로 채우면 안 됩니다.
--       branch_id 는 null 로 두고 (center_id, setting_key) unique 로 센터별 구분합니다.

drop index if exists public.reward_settings_global_key_uidx;

-- 센터별 설정: center_id + setting_key 당 1건
create unique index if not exists reward_settings_center_setting_key_uidx
  on public.reward_settings (center_id, setting_key);

-- 레거시 전역 설정(earn_rules 등): center_id 없는 행만
create unique index if not exists reward_settings_global_key_uidx
  on public.reward_settings (setting_key)
  where branch_id is null and center_id is null;
