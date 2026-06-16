-- 센터 ID 불일치 복구 (걸음 인증·마일리지가 안 보이던 문제)
-- Supabase SQL Editor에서 migration_044 이후 실행

-- 회원 소속 센터와 다른 center_id로 저장된 행을 회원 기준으로 맞춥니다.
update public.step_verifications sv
set center_id = m.center_id
from public.members m
where sv.member_id = m.id
  and sv.center_id is distinct from m.center_id;

update public.reward_transactions rt
set center_id = m.center_id
from public.members m
where rt.member_id = m.id
  and rt.center_id is distinct from m.center_id;

update public.reward_balances rb
set center_id = m.center_id
from public.members m
where rb.member_id = m.id
  and rb.center_id is distinct from m.center_id;

update public.reward_mile_lots rml
set center_id = m.center_id
from public.members m
where rml.member_id = m.id
  and rml.center_id is distinct from m.center_id;

update public.member_daily_activity mda
set center_id = m.center_id
from public.members m
where mda.member_id = m.id
  and mda.center_id is distinct from m.center_id;

update public.center_photo_submissions cps
set center_id = m.center_id
from public.members m
where cps.member_id = m.id
  and cps.center_id is distinct from m.center_id;

update public.period_extensions pe
set center_id = m.center_id
from public.members m
where pe.member_id = m.id
  and pe.center_id is distinct from m.center_id;
