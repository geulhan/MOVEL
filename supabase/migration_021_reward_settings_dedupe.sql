-- reward_settings 전역 설정 중복 정리
-- branch_id IS NULL 은 UNIQUE(branch_id, setting_key) 에서 서로 다른 행으로 취급됨
-- earn_rules, redemption, pt_pricing 등 모든 전역 키에 대해 최신 1건만 유지
-- Supabase SQL Editor에서 실행하세요.

delete from public.reward_settings rs
where rs.branch_id is null
  and rs.id not in (
    select distinct on (setting_key) id
    from public.reward_settings
    where branch_id is null
    order by setting_key, updated_at desc, id desc
  );

create unique index if not exists reward_settings_global_key_uidx
  on public.reward_settings (setting_key)
  where branch_id is null;
