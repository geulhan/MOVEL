-- 센터 사진 SCORE +20, 네이버 리뷰 MILE 10,000으로 조정
-- Supabase SQL Editor에서 실행하세요.

update public.reward_settings
set setting_value = setting_value || '{"center_photo": {"score": 20, "mile": 500}}'::jsonb,
    updated_at = now()
where branch_id is null
  and setting_key = 'earn_rules'
  and not (setting_value ? 'center_photo');

update public.reward_settings
set setting_value = jsonb_set(
      setting_value,
      '{center_photo,score}',
      '20'::jsonb,
      true
    ),
    updated_at = now()
where branch_id is null
  and setting_key = 'earn_rules'
  and setting_value ? 'center_photo';

update public.reward_settings
set setting_value = jsonb_set(
      setting_value,
      '{naver_review,mile}',
      '10000'::jsonb,
      true
    ),
    updated_at = now()
where branch_id is null
  and setting_key = 'earn_rules'
  and setting_value ? 'naver_review';
