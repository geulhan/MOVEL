-- PT 예약 리마인더 중복 발송 방지 인덱스
-- Supabase SQL Editor에서 실행하세요.

create index if not exists message_logs_pt_reminder_dedup_idx
  on public.message_logs (member_id, (metadata->>'schedule_id'))
  where template_key = 'pt_reminder';
