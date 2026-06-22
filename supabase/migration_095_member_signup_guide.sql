-- member_welcome → member_signup_guide 템플릿 키 변경
-- Supabase SQL Editor에서 실행하세요.

alter table public.message_logs
  drop constraint if exists message_logs_template_key_check;

alter table public.message_logs
  add constraint message_logs_template_key_check check (
    template_key in (
      'member_signup_guide',
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
      'step_verification_result',
      'welcome',
      'payment_done',
      'renewal',
      'pt_reminder'
    )
  );

comment on column public.message_logs.template_key is
  '알림톡 템플릿 키. 회원 등록 안내는 member_signup_guide. member_welcome/welcome은 레거시 이력 호환.';
