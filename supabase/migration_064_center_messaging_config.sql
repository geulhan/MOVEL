-- 센터별 알림톡/문자(Solapi) 설정
-- migration_049 이후 실행

create table if not exists public.center_messaging_config (
  center_id uuid primary key references public.centers (id) on delete cascade,
  enabled boolean not null default false,
  use_platform_api_keys boolean not null default true,
  pf_id text,
  from_number text,
  sender_name text,
  template_welcome text,
  template_payment_done text,
  template_renewal text,
  template_step_verification_result text,
  template_pt_reminder text,
  updated_at timestamptz not null default now()
);

create table if not exists public.center_messaging_secrets (
  center_id uuid primary key references public.centers (id) on delete cascade,
  api_key text not null,
  api_secret text not null,
  updated_at timestamptz not null default now()
);

alter table public.center_messaging_config enable row level security;
alter table public.center_messaging_secrets enable row level security;

drop trigger if exists center_messaging_config_updated_at on public.center_messaging_config;
create trigger center_messaging_config_updated_at
  before update on public.center_messaging_config
  for each row execute function public.set_updated_at();

drop trigger if exists center_messaging_secrets_updated_at on public.center_messaging_secrets;
create trigger center_messaging_secrets_updated_at
  before update on public.center_messaging_secrets
  for each row execute function public.set_updated_at();

create or replace function public.get_center_messaging_settings(
  p_session_token text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_config public.center_messaging_config%rowtype;
  v_has_custom_api_keys boolean := false;
begin
  select * into v_session
  from public.verify_auth_session(p_session_token, 'center_user')
  limit 1;

  if v_session.actor_id is null or v_session.center_id is null then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if v_session.role not in ('admin', 'center_admin') then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_config
  from public.center_messaging_config
  where center_id = v_session.center_id;

  select exists (
    select 1
    from public.center_messaging_secrets cms
    where cms.center_id = v_session.center_id
  ) into v_has_custom_api_keys;

  return json_build_object(
    'ok', true,
    'center_id', v_session.center_id,
    'config', json_build_object(
      'enabled', coalesce(v_config.enabled, false),
      'usePlatformApiKeys', coalesce(v_config.use_platform_api_keys, true),
      'pfId', coalesce(v_config.pf_id, ''),
      'fromNumber', coalesce(v_config.from_number, ''),
      'senderName', coalesce(v_config.sender_name, ''),
      'templateIds', json_build_object(
        'welcome', coalesce(v_config.template_welcome, ''),
        'payment_done', coalesce(v_config.template_payment_done, ''),
        'renewal', coalesce(v_config.template_renewal, ''),
        'step_verification_result', coalesce(v_config.template_step_verification_result, ''),
        'pt_reminder', coalesce(v_config.template_pt_reminder, '')
      )
    ),
    'hasCustomApiKeys', v_has_custom_api_keys
  );
end;
$$;

create or replace function public.update_center_messaging_settings(
  p_session_token text,
  p_config jsonb,
  p_api_key text default null,
  p_api_secret text default null,
  p_clear_api_keys boolean default false
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_template_ids jsonb;
begin
  select * into v_session
  from public.verify_auth_session(p_session_token, 'center_user')
  limit 1;

  if v_session.actor_id is null or v_session.center_id is null then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if v_session.role not in ('admin', 'center_admin') then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_config is null or jsonb_typeof(p_config) <> 'object' then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  v_template_ids := coalesce(p_config -> 'templateIds', '{}'::jsonb);

  insert into public.center_messaging_config (
    center_id,
    enabled,
    use_platform_api_keys,
    pf_id,
    from_number,
    sender_name,
    template_welcome,
    template_payment_done,
    template_renewal,
    template_step_verification_result,
    template_pt_reminder
  )
  values (
    v_session.center_id,
    coalesce((p_config ->> 'enabled')::boolean, false),
    coalesce((p_config ->> 'usePlatformApiKeys')::boolean, true),
    nullif(trim(coalesce(p_config ->> 'pfId', '')), ''),
    nullif(trim(coalesce(p_config ->> 'fromNumber', '')), ''),
    nullif(trim(coalesce(p_config ->> 'senderName', '')), ''),
    nullif(trim(coalesce(v_template_ids ->> 'welcome', '')), ''),
    nullif(trim(coalesce(v_template_ids ->> 'payment_done', '')), ''),
    nullif(trim(coalesce(v_template_ids ->> 'renewal', '')), ''),
    nullif(trim(coalesce(v_template_ids ->> 'step_verification_result', '')), ''),
    nullif(trim(coalesce(v_template_ids ->> 'pt_reminder', '')), '')
  )
  on conflict (center_id) do update set
    enabled = excluded.enabled,
    use_platform_api_keys = excluded.use_platform_api_keys,
    pf_id = excluded.pf_id,
    from_number = excluded.from_number,
    sender_name = excluded.sender_name,
    template_welcome = excluded.template_welcome,
    template_payment_done = excluded.template_payment_done,
    template_renewal = excluded.template_renewal,
    template_step_verification_result = excluded.template_step_verification_result,
    template_pt_reminder = excluded.template_pt_reminder,
    updated_at = now();

  if p_clear_api_keys then
    delete from public.center_messaging_secrets
    where center_id = v_session.center_id;
  elsif not coalesce((p_config ->> 'usePlatformApiKeys')::boolean, true)
    and nullif(trim(coalesce(p_api_key, '')), '') is not null
    and nullif(trim(coalesce(p_api_secret, '')), '') is not null then
    insert into public.center_messaging_secrets (center_id, api_key, api_secret)
    values (
      v_session.center_id,
      trim(p_api_key),
      trim(p_api_secret)
    )
    on conflict (center_id) do update set
      api_key = excluded.api_key,
      api_secret = excluded.api_secret,
      updated_at = now();
  end if;

  return public.get_center_messaging_settings(p_session_token);
end;
$$;

revoke all on function public.get_center_messaging_settings(text) from public;
grant execute on function public.get_center_messaging_settings(text) to anon, authenticated;

revoke all on function public.update_center_messaging_settings(text, jsonb, text, text, boolean) from public;
grant execute on function public.update_center_messaging_settings(text, jsonb, text, text, boolean) to anon, authenticated;
