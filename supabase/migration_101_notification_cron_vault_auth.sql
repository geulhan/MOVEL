-- Cron → notification-cron 호출 시 Service Role Bearer 인증 지원
-- Vault secret: notification_cron_service_role_key (service_role JWT)

create or replace function public.invoke_notification_cron()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_base_url text;
  v_internal_secret text;
  v_service_role text;
  v_request_id bigint;
  v_headers jsonb;
begin
  select decrypted_secret into v_base_url
  from vault.decrypted_secrets
  where name = 'notification_cron_project_url'
  limit 1;

  select decrypted_secret into v_internal_secret
  from vault.decrypted_secrets
  where name = 'notification_cron_internal_secret'
  limit 1;

  select decrypted_secret into v_service_role
  from vault.decrypted_secrets
  where name = 'notification_cron_service_role_key'
  limit 1;

  if v_base_url is null then
    raise warning 'notification cron skipped: vault secret notification_cron_project_url not set';
    return null;
  end if;

  if v_internal_secret is not null then
    v_headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notification-cron-key', v_internal_secret
    );
  elsif v_service_role is not null then
    v_headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role
    );
  else
    raise warning
      'notification cron skipped: set notification_cron_service_role_key or notification_cron_internal_secret in vault';
    return null;
  end if;

  select net.http_post(
    url := rtrim(v_base_url, '/') || '/functions/v1/notification-cron',
    headers := v_headers,
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) into v_request_id;

  return v_request_id;
end;
$$;
