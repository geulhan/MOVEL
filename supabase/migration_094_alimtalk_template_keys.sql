-- MotionHub 알림톡 12종 템플릿 키 확장 + 중복 발송 방지 인덱스
-- Supabase SQL Editor에서 실행하세요.

alter table public.message_logs
  drop constraint if exists message_logs_template_key_check;

alter table public.message_logs
  add constraint message_logs_template_key_check check (
    template_key in (
      -- 신규 12종
      'member_welcome',
      'payment_completed',
      'schedule_reminder',
      'pt_remaining_3',
      'pt_remaining_1',
      'membership_expire_14',
      'membership_expire_7',
      'membership_expire_today',
      'schedule_changed',
      'schedule_cancelled',
      'center_welcome',
      'weekly_report',
      -- 기타
      'step_verification_result',
      -- 레거시 이력 호환
      'welcome',
      'payment_done',
      'renewal',
      'pt_reminder'
    )
  );

-- PT 잔여 회차 알림: 회원·수강권(remaining) 기준 1회
create unique index if not exists message_logs_pt_remaining_dedup_idx
  on public.message_logs (
    member_id,
    template_key,
    ((metadata ->> 'membership_key'))
  )
  where template_key in ('pt_remaining_3', 'pt_remaining_1')
    and status in ('sent', 'skipped');

-- 회원권 만료 알림: 회원·만료일 기준 1회
create unique index if not exists message_logs_membership_expire_dedup_idx
  on public.message_logs (
    member_id,
    template_key,
    ((metadata ->> 'expire_date'))
  )
  where template_key in (
    'membership_expire_14',
    'membership_expire_7',
    'membership_expire_today'
  )
    and status in ('sent', 'skipped');

-- 수업 리마인더: 예약 기준 1회
create unique index if not exists message_logs_schedule_reminder_dedup_idx
  on public.message_logs (
    member_id,
    template_key,
    ((metadata ->> 'schedule_id'))
  )
  where template_key = 'schedule_reminder'
    and status in ('sent', 'skipped');

-- 예약 변경/취소: 예약·템플릿 기준 1회
create unique index if not exists message_logs_schedule_event_dedup_idx
  on public.message_logs (
    member_id,
    template_key,
    ((metadata ->> 'schedule_id'))
  )
  where template_key in ('schedule_changed', 'schedule_cancelled')
    and status in ('sent', 'skipped');

-- 센터 주간 리포트: 센터·주차 기준 1회
create unique index if not exists message_logs_weekly_report_dedup_idx
  on public.message_logs (
    center_id,
    template_key,
    ((metadata ->> 'report_week'))
  )
  where template_key = 'weekly_report'
    and status in ('sent', 'skipped');

comment on column public.message_logs.template_key is
  '알림톡 템플릿 키 (member_welcome, payment_completed, …). 레거시 welcome/payment_done 등은 이력 호환용.';
