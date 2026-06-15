-- MotionHub: 센터 서비스 이용 기간 + 기간 설정 시 재활성화
-- migration_049 이후 실행

alter table public.centers
  add column if not exists service_starts_at date,
  add column if not exists service_ends_at date;

comment on column public.centers.service_starts_at is
  'MotionHub 서비스 이용 시작일 (KST 기준). null이면 시작 제한 없음.';
comment on column public.centers.service_ends_at is
  'MotionHub 서비스 이용 종료일 (KST 기준). null이면 종료 제한 없음.';

create or replace function public.center_local_today()
returns date
language sql
stable
as $$
  select timezone('Asia/Seoul', now())::date;
$$;

create or replace function public.center_service_period_ok(p_center public.centers)
returns boolean
language sql
stable
as $$
  select
    (p_center.service_starts_at is null or p_center.service_starts_at <= public.center_local_today())
    and (p_center.service_ends_at is null or p_center.service_ends_at >= public.center_local_today());
$$;

create or replace function public.check_center_service_access(p_center public.centers)
returns json
language plpgsql
stable
as $$
begin
  if p_center.deleted_at is not null then
    return json_build_object('ok', false, 'error', 'center_not_found');
  end if;

  if p_center.status = 'suspended' then
    return json_build_object('ok', false, 'error', 'center_suspended');
  end if;

  if p_center.status = 'inactive' then
    return json_build_object('ok', false, 'error', 'center_inactive');
  end if;

  if p_center.service_starts_at is not null
     and p_center.service_starts_at > public.center_local_today() then
    return json_build_object('ok', false, 'error', 'center_service_not_started');
  end if;

  if p_center.service_ends_at is not null
     and p_center.service_ends_at < public.center_local_today() then
    return json_build_object('ok', false, 'error', 'center_service_expired');
  end if;

  return json_build_object('ok', true);
end;
$$;

create or replace function public.list_centers_for_platform(
  p_session_token text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  ) then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  return json_build_object(
    'ok', true,
    'centers', coalesce(
      (
        select json_agg(
          json_build_object(
            'id', c.id,
            'name', c.name,
            'slug', c.slug,
            'status', c.status,
            'plan_code', sp.code,
            'member_count', (
              select count(*)::int from public.members m where m.center_id = c.id
            ),
            'trainer_count', (
              select count(*)::int
              from public.trainers t
              where t.center_id = c.id and t.is_active = true
            ),
            'service_starts_at', c.service_starts_at,
            'service_ends_at', c.service_ends_at,
            'service_period_ok', public.center_service_period_ok(c),
            'created_at', c.created_at
          )
          order by c.created_at desc
        )
        from public.centers c
        left join public.subscription_plans sp on sp.id = c.plan_id
        where c.deleted_at is null
      ),
      '[]'::json
    )
  );
end;
$$;

create or replace function public.update_center_service_period(
  p_session_token text,
  p_center_id uuid,
  p_service_starts_at date default null,
  p_service_ends_at date default null,
  p_reactivate boolean default true
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_center public.centers%rowtype;
  v_starts date := p_service_starts_at;
  v_ends date := p_service_ends_at;
  v_should_activate boolean := false;
begin
  if not exists (
    select 1
    from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  ) then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if p_center_id is null then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  if v_starts is not null and v_ends is not null and v_ends < v_starts then
    return json_build_object(
      'ok', false,
      'error', 'invalid_range',
      'message', '이용 종료일은 시작일보다 빠를 수 없습니다.'
    );
  end if;

  select * into v_center
  from public.centers
  where id = p_center_id
    and deleted_at is null;

  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  v_should_activate := coalesce(p_reactivate, true)
    and (v_starts is null or v_starts <= public.center_local_today())
    and (v_ends is null or v_ends >= public.center_local_today());

  update public.centers
  set
    service_starts_at = v_starts,
    service_ends_at = v_ends,
    status = case when v_should_activate then 'active' else status end,
    suspended_at = case when v_should_activate then null else suspended_at end,
    updated_at = now()
  where id = p_center_id
  returning * into v_center;

  return json_build_object(
    'ok', true,
    'center_id', v_center.id,
    'status', v_center.status,
    'service_starts_at', v_center.service_starts_at,
    'service_ends_at', v_center.service_ends_at,
    'service_period_ok', public.center_service_period_ok(v_center),
    'reactivated', v_should_activate
  );
end;
$$;

create or replace function public.verify_admin_login(
  p_username text,
  p_password text,
  p_center_slug text default 'movel'
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.center_users%rowtype;
  v_center public.centers%rowtype;
  v_trainer_name text;
  v_token text;
  v_slug text := lower(trim(coalesce(p_center_slug, 'movel')));
  v_role text;
  v_access json;
begin
  if p_username is null or trim(p_username) = '' or p_password is null or p_password = '' then
    return json_build_object('ok', false);
  end if;

  select * into v_center
  from public.centers
  where slug = v_slug
    and deleted_at is null;

  if not found then
    return json_build_object('ok', false, 'error', 'center_not_found');
  end if;

  v_access := public.check_center_service_access(v_center);
  if coalesce((v_access ->> 'ok')::boolean, false) is not true then
    return v_access;
  end if;

  select * into v_user
  from public.center_users
  where center_id = v_center.id
    and username = lower(trim(p_username))
    and status = 'active'
    and password_hash = extensions.crypt(p_password, password_hash);

  if not found then
    return json_build_object('ok', false);
  end if;

  if v_user.role = 'trainer' and v_user.trainer_id is not null then
    select name into v_trainer_name
    from public.trainers
    where id = v_user.trainer_id;
  end if;

  v_role := case
    when v_user.role = 'trainer' then 'trainer'
    else 'admin'
  end;

  v_token := public.create_auth_session(
    'center_user',
    v_user.id,
    v_center.id,
    v_role
  );

  update public.center_users
  set last_login_at = now()
  where id = v_user.id;

  return json_build_object(
    'ok', true,
    'id', v_user.id,
    'username', v_user.username,
    'token', v_token,
    'role', v_role,
    'trainer_id', v_user.trainer_id,
    'trainer_name', v_trainer_name,
    'center_id', v_center.id,
    'center_slug', v_center.slug,
    'center_name', v_center.name
  );
end;
$$;

create or replace function public.verify_member_login(
  p_phone text,
  p_password text,
  p_device_type text default 'unknown',
  p_center_slug text default 'movel'
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_member public.members%rowtype;
  v_center public.centers%rowtype;
  v_hash text;
  v_token text;
  v_digits text;
  v_slug text := lower(trim(coalesce(p_center_slug, 'movel')));
  v_access json;
begin
  select * into v_center
  from public.centers
  where slug = v_slug
    and deleted_at is null;

  if not found then
    return json_build_object('ok', false, 'error', 'center_not_configured');
  end if;

  v_access := public.check_center_service_access(v_center);
  if coalesce((v_access ->> 'ok')::boolean, false) is not true then
    return v_access;
  end if;

  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if v_digits = '' or p_password is null or p_password = '' then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  select * into v_member
  from public.members
  where center_id = v_center.id
    and regexp_replace(phone, '\D', '', 'g') = v_digits;

  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  select password_hash into v_hash
  from public.member_credentials
  where member_id = v_member.id;

  if v_hash is null then
    return json_build_object('ok', false, 'error', 'no_credentials');
  end if;

  if v_hash <> extensions.crypt(p_password, v_hash) then
    return json_build_object('ok', false, 'error', 'wrong_password');
  end if;

  v_token := public.create_auth_session(
    'member',
    v_member.id,
    v_center.id,
    'member'
  );

  perform public.insert_member_login_log(v_member.id, p_device_type);

  return json_build_object(
    'ok', true,
    'id', v_member.id,
    'name', v_member.name,
    'phone', regexp_replace(v_member.phone, '\D', '', 'g'),
    'token', v_token,
    'center_id', v_center.id,
    'center_slug', v_slug
  );
end;
$$;

revoke all on function public.update_center_service_period(text, uuid, date, date, boolean) from public;
grant execute on function public.update_center_service_period(text, uuid, date, date, boolean) to anon, authenticated;
