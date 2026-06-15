-- 긴급: 관리자 로그인 — 아이디만으로 센터 자동 매칭 (migration_051 재적용 + movel 복구)
-- migration_054 / 055 이후 실행

drop function if exists public.verify_admin_login(text, text);

create or replace function public.verify_admin_login(
  p_username text,
  p_password text,
  p_center_slug text default null
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
  v_slug text := nullif(lower(trim(coalesce(p_center_slug, ''))), '');
  v_role text;
  v_access json;
  v_match_count int;
begin
  if p_username is null or trim(p_username) = '' or p_password is null or p_password = '' then
    return json_build_object('ok', false);
  end if;

  if v_slug is not null then
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
  else
    select count(*)::int into v_match_count
    from public.center_users cu
    join public.centers c on c.id = cu.center_id
    where cu.username = lower(trim(p_username))
      and cu.status = 'active'
      and c.deleted_at is null
      and cu.password_hash = extensions.crypt(p_password, cu.password_hash);

    if v_match_count = 0 then
      return json_build_object('ok', false);
    end if;

    if v_match_count > 1 then
      return json_build_object(
        'ok', false,
        'error', 'multiple_centers',
        'message', '동일한 아이디가 여러 센터에 있습니다. 센터 주소를 지정해 주세요.'
      );
    end if;

    select cu.* into v_user
    from public.center_users cu
    join public.centers c on c.id = cu.center_id
    where cu.username = lower(trim(p_username))
      and cu.status = 'active'
      and c.deleted_at is null
      and cu.password_hash = extensions.crypt(p_password, cu.password_hash)
    limit 1;

    if not found then
      return json_build_object('ok', false);
    end if;

    select * into v_center
    from public.centers
    where id = v_user.center_id
      and deleted_at is null;

    if not found then
      return json_build_object('ok', false, 'error', 'center_not_found');
    end if;

    v_access := public.check_center_service_access(v_center);
    if coalesce((v_access ->> 'ok')::boolean, false) is not true then
      return v_access;
    end if;
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

revoke all on function public.verify_admin_login(text, text, text) from public;
grant execute on function public.verify_admin_login(text, text, text) to anon, authenticated;

-- movel 센터 복구 (삭제·비활성 시 로그인 불가)
insert into public.centers (name, slug, status)
values ('모벨 퍼포먼스 트레이닝', 'movel', 'active')
on conflict (slug) do update
set
  name = excluded.name,
  status = case
    when public.centers.deleted_at is not null then 'active'
    else public.centers.status
  end,
  deleted_at = null,
  updated_at = now();

-- 이용 기간 컬럼이 있으면 movel 기간 보정
do $$
declare
  v_center_id uuid;
  v_today date;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'centers'
      and column_name = 'service_starts_at'
  ) then
    return;
  end if;

  v_today := public.center_local_today();

  update public.centers
  set
    service_starts_at = coalesce(service_starts_at, v_today),
    service_ends_at = coalesce(service_ends_at, v_today + 365),
    status = case when status = 'inactive' then 'active' else status end
  where slug = 'movel'
    and deleted_at is null;

  select id into v_center_id
  from public.centers
  where slug = 'movel'
    and deleted_at is null
  limit 1;

  if v_center_id is null then
    return;
  end if;

  -- legacy admin_users → center_users (미이전 계정 복구)
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'admin_users'
  ) then
    insert into public.center_users (
      center_id,
      role,
      username,
      password_hash,
      display_name,
      status,
      trainer_id
    )
    select
      v_center_id,
      case
        when au.role = 'trainer' and au.trainer_id is not null then 'trainer'::public.center_role
        else 'center_admin'::public.center_role
      end,
      lower(trim(au.username)),
      au.password_hash,
      au.username,
      'active',
      case
        when au.role = 'trainer' then au.trainer_id
        else null
      end
    from public.admin_users au
    where coalesce(au.center_id, v_center_id) = v_center_id
      and not exists (
        select 1
        from public.center_users cu
        where cu.center_id = v_center_id
          and cu.username = lower(trim(au.username))
      );
  end if;
end;
$$;
