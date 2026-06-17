-- 회원 로그인: 센터 미지정 시에도 정확한 오류 + 전화번호 조회 개선
-- migration_079 이후 실행

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
  v_phone_count int;
  v_password_match_count int;
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
      return json_build_object(
        'ok', false,
        'error', 'center_not_configured',
        'message', '센터를 찾을 수 없습니다. 센터에서 안내한 회원 페이지 링크로 접속해 주세요.'
      );
    end if;

    v_access := public.check_center_service_access(v_center);
    if coalesce((v_access ->> 'ok')::boolean, false) is not true then
      return v_access;
    end if;

    select * into v_member
    from public.members m
    where m.center_id = v_center.id
      and regexp_replace(m.phone, '\D', '', 'g') = v_digits;

    if not found then
      return json_build_object(
        'ok', false,
        'error', 'not_found',
        'message', '이 센터에 등록되지 않은 휴대전화번호입니다.'
      );
    end if;
  else
    select count(*)::int into v_phone_count
    from public.members m
    inner join public.centers c on c.id = m.center_id and c.deleted_at is null
    where regexp_replace(m.phone, '\D', '', 'g') = v_digits;

    if v_phone_count = 0 then
      return json_build_object('ok', false, 'error', 'not_found');
    end if;

    select count(*)::int into v_password_match_count
    from public.members m
    inner join public.centers c on c.id = m.center_id and c.deleted_at is null
    inner join public.member_credentials mc on mc.member_id = m.id
    where regexp_replace(m.phone, '\D', '', 'g') = v_digits
      and mc.password_hash = extensions.crypt(p_password, mc.password_hash);

    if v_password_match_count > 1 then
      return json_build_object(
        'ok', false,
        'error', 'multiple_centers',
        'message', '여러 센터에 등록된 번호입니다. 센터에서 안내한 링크로 접속해 주세요.'
      );
    end if;

    if v_password_match_count = 1 then
      select m.* into v_member
      from public.members m
      inner join public.centers c on c.id = m.center_id and c.deleted_at is null
      inner join public.member_credentials mc on mc.member_id = m.id
      where regexp_replace(m.phone, '\D', '', 'g') = v_digits
        and mc.password_hash = extensions.crypt(p_password, mc.password_hash)
      limit 1;
    elsif v_phone_count = 1 then
      select m.* into v_member
      from public.members m
      inner join public.centers c on c.id = m.center_id and c.deleted_at is null
      where regexp_replace(m.phone, '\D', '', 'g') = v_digits
      limit 1;

      select password_hash into v_hash
      from public.member_credentials
      where member_id = v_member.id;

      if v_hash is null then
        return json_build_object('ok', false, 'error', 'no_credentials');
      end if;

      return json_build_object('ok', false, 'error', 'wrong_password');
    else
      return json_build_object(
        'ok', false,
        'error', 'center_required',
        'message', '가입·이용 중인 센터를 선택하거나, 센터에서 안내한 회원 페이지 링크로 접속해 주세요.'
      );
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

grant execute on function public.verify_member_login(text, text, text, text) to anon, authenticated;
