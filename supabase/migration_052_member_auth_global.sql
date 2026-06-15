-- MotionHub: 회원 로그인/가입 — 센터 주소 없이 전화번호 로그인 + 센터 링크 가입
-- migration_051 이후 실행

create or replace function public.register_member(
  p_name text,
  p_phone text,
  p_password text,
  p_device_type text default 'unknown',
  p_center_slug text default null
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_member public.members%rowtype;
  v_center public.centers%rowtype;
  v_digits text;
  v_token text;
  v_slug text := nullif(lower(trim(coalesce(p_center_slug, ''))), '');
  v_access json;
begin
  if v_slug is null then
    return json_build_object(
      'ok', false,
      'error', 'center_required',
      'message', '센터에서 안내한 회원 페이지 링크로 접속해 주세요.'
    );
  end if;

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

  if trim(coalesce(p_name, '')) = '' then
    return json_build_object('ok', false, 'error', 'invalid_name');
  end if;

  if length(v_digits) <> 11 or left(v_digits, 3) <> '010' then
    return json_build_object('ok', false, 'error', 'invalid_phone');
  end if;

  if p_password is null or length(p_password) < 4 then
    return json_build_object('ok', false, 'error', 'invalid_password');
  end if;

  if exists (
    select 1 from public.members m
    where m.center_id = v_center.id
      and regexp_replace(m.phone, '\D', '', 'g') = v_digits
  ) then
    return json_build_object('ok', false, 'error', 'already_exists');
  end if;

  insert into public.members (
    center_id,
    name,
    phone,
    total_sessions,
    remaining_sessions,
    payment_amount,
    registered_at,
    expires_at,
    status
  )
  values (
    v_center.id,
    trim(p_name),
    v_digits,
    0,
    0,
    0,
    current_date,
    null,
    'active'
  )
  returning * into v_member;

  insert into public.member_credentials (member_id, center_id, password_hash)
  values (
    v_member.id,
    v_center.id,
    extensions.crypt(p_password, extensions.gen_salt('bf'))
  )
  on conflict (member_id) do update
  set
    center_id = excluded.center_id,
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
    updated_at = now();

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
    'phone', v_member.phone,
    'token', v_token,
    'center_id', v_center.id,
    'center_slug', v_slug,
    'center_name', v_center.name
  );
exception
  when unique_violation then
    return json_build_object('ok', false, 'error', 'already_exists');
end;
$$;

create or replace function public.verify_member_login(
  p_phone text,
  p_password text,
  p_device_type text default 'unknown',
  p_center_slug text default null
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
  v_slug text := nullif(lower(trim(coalesce(p_center_slug, ''))), '');
  v_access json;
  v_match_count int;
begin
  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if v_digits = '' or p_password is null or p_password = '' then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  if v_slug is not null then
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

    select * into v_member
    from public.members
    where center_id = v_center.id
      and regexp_replace(phone, '\D', '', 'g') = v_digits;

    if not found then
      return json_build_object('ok', false, 'error', 'not_found');
    end if;
  else
    select count(*)::int into v_match_count
    from public.members m
    join public.member_credentials mc on mc.member_id = m.id
    join public.centers c on c.id = m.center_id
    where regexp_replace(m.phone, '\D', '', 'g') = v_digits
      and c.deleted_at is null
      and mc.password_hash = extensions.crypt(p_password, mc.password_hash);

    if v_match_count = 0 then
      return json_build_object('ok', false, 'error', 'not_found');
    end if;

    if v_match_count > 1 then
      return json_build_object(
        'ok', false,
        'error', 'multiple_centers',
        'message', '여러 센터에 등록된 번호입니다. 센터에서 안내한 링크로 접속해 주세요.'
      );
    end if;

    select m.* into v_member
    from public.members m
    join public.member_credentials mc on mc.member_id = m.id
    join public.centers c on c.id = m.center_id
    where regexp_replace(m.phone, '\D', '', 'g') = v_digits
      and c.deleted_at is null
      and mc.password_hash = extensions.crypt(p_password, mc.password_hash)
    limit 1;

    if not found then
      return json_build_object('ok', false, 'error', 'not_found');
    end if;

    select * into v_center
    from public.centers
    where id = v_member.center_id
      and deleted_at is null;

    if not found then
      return json_build_object('ok', false, 'error', 'center_not_configured');
    end if;

    v_access := public.check_center_service_access(v_center);
    if coalesce((v_access ->> 'ok')::boolean, false) is not true then
      return v_access;
    end if;
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
    'center_slug', v_center.slug,
    'center_name', v_center.name
  );
end;
$$;
