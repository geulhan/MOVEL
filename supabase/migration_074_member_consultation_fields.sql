-- 상담기록 구조화 필드 확장
-- Supabase SQL Editor에서 실행

alter table public.member_consultations
  add column if not exists visit_purpose text not null default '',
  add column if not exists occupation_work_pattern text not null default '',
  add column if not exists sitting_activity_time text not null default '',
  add column if not exists current_discomfort text not null default '',
  add column if not exists injury_treatment_history text not null default '',
  add column if not exists sleep_diet text not null default '',
  add column if not exists exercise_experience text not null default '',
  add column if not exists posture_assessment text not null default '',
  add column if not exists movement_assessment text not null default '';

-- 기존 항목 → 신규 항목으로 최대한 이전
update public.member_consultations
set visit_purpose = goals
where visit_purpose = '' and goals <> '';

update public.member_consultations
set current_discomfort = pain_status
where current_discomfort = '' and pain_status <> '';

update public.member_consultations
set exercise_experience = exercise_progress
where exercise_experience = '' and exercise_progress <> '';

update public.member_consultations
set injury_treatment_history = special_notes
where injury_treatment_history = '' and special_notes <> '';
