-- PT 잔여 3·1회 + 수업 24시간 이내 리마인더 자동발송 (pg_cron)
-- Supabase SQL Editor에서 실행하세요.
--
-- 사전 준비 (Vault — Dashboard → SQL Editor):
--   select vault.create_secret(
--     'https://dcoitajktdaqejnhrnij.supabase.co',
--     'notification_cron_project_url',
--     'MotionHub Supabase project URL for notification cron'
--   );
--   select vault.create_secret(
--     'YOUR_NOTIFICATION_INTERNAL_SECRET',
--     'notification_cron_internal_secret',
--     'Same value as Edge Function NOTIFICATION_INTERNAL_SECRET'
--   );
--
-- Edge Function 배포:
--   supabase functions deploy notification-cron
--   supabase functions deploy schedule-reminders
--   supabase functions deploy pt-reminders

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_notification_cron()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_base_url text;
  v_secret text;
  v_request_id bigint;
begin
  select decrypted_secret into v_base_url
  from vault.decrypted_secrets
  where name = 'notification_cron_project_url'
  limit 1;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'notification_cron_internal_secret'
  limit 1;

  if v_base_url is null or v_secret is null then
    raise warning
      'notification cron skipped: vault secrets notification_cron_project_url / notification_cron_internal_secret not set';
    return null;
  end if;

  select net.http_post(
    url := rtrim(v_base_url, '/') || '/functions/v1/notification-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-mobel-notification-key', v_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) into v_request_id;

  return v_request_id;
end;
$$;

comment on function public.invoke_notification_cron() is
  '자동발송: PT 잔여 3·1회, 수업 24시간 이내 리마인더 (미발송 보완). 매시 pg_cron에서 호출.';

revoke all on function public.invoke_notification_cron() from public;
grant execute on function public.invoke_notification_cron() to postgres, service_role;

do $body$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'motionhub-notification-automation-hourly';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'motionhub-notification-automation-hourly',
    '0 * * * *',
    $cron$ select public.invoke_notification_cron(); $cron$
  );
end;
$body$;

-- message_campaigns 시드: PT 잔여 자동발송 규칙 활성화 (향후 메시지센터 UI용)
update public.message_campaigns
set
  status = 'active',
  is_enabled = true,
  trigger_config = coalesce(trigger_config, '{}'::jsonb) ||
    '{"event":"pt_sessions_threshold","sessions_threshold":3,"dedup_scope":["member_id","threshold"]}'::jsonb
where metadata->>'seed_code' = 'auto_pt_sessions_3'
  and is_enabled = false;

update public.message_campaigns
set
  status = 'active',
  is_enabled = true,
  trigger_config = coalesce(trigger_config, '{}'::jsonb) ||
    '{"event":"pt_sessions_threshold","sessions_threshold":1,"dedup_scope":["member_id","threshold"]}'::jsonb
where metadata->>'seed_code' = 'auto_pt_sessions_1'
  and is_enabled = false;
