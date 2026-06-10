-- DB 상태 점검 (데이터 삭제 없음, 조회만)
-- Supabase SQL Editor → 새 쿼리 탭 → 이 파일만 실행

-- 1) 핵심 테이블 존재 여부
select
  table_name,
  case when to_regclass('public.' || table_name) is not null then 'OK' else 'MISSING' end as status
from (
  values
    ('members'),
    ('trainers'),
    ('session_logs'),
    ('payment_history'),
    ('attendance_logs'),
    ('exercise_journals'),
    ('pt_schedules'),
    ('member_consultations'),
    ('reward_balances'),
    ('reward_transactions'),
    ('step_verifications'),
    ('step_verification_codes')
) as t(table_name)
order by table_name;

-- 2) 데이터 건수
select 'members' as table_name, count(*)::int as rows from public.members
union all select 'trainers', count(*)::int from public.trainers
union all select 'session_logs', count(*)::int from public.session_logs
union all select 'payment_history', count(*)::int from public.payment_history
union all select 'attendance_logs', count(*)::int from public.attendance_logs
union all select 'reward_balances', count(*)::int from public.reward_balances
union all select 'step_verifications', count(*)::int from public.step_verifications
order by table_name;

-- 3) Storage 버킷 (걸음 OCR 이미지)
select id, name, public from storage.buckets where id = 'step-verifications';
