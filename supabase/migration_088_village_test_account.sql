-- 마을 키우기 테스트용 슈퍼 회원 (모벨 퍼포먼스 센터 전용)
-- migration_087 이후 실행
--
-- 로그인: /member?center=movel
--   아이디(전화번호): 01067780001  (화면: 010-6778-0001)
--   비밀번호: 1q2w3e
--
-- 부여: 도토리 9,999 · 성장치 5,000 · 마일리지 10,000M

do $$
declare
  v_center_id uuid;
  v_member_id uuid;
  v_user_id uuid;
  v_phone text := '01067780001';
  v_phone_digits text := '01067780001';
  v_password text := '1q2w3e';
  v_name text := '마을테스트6778';
begin
  select id into v_center_id
  from public.centers
  where lower(slug) = 'movel'
    and status = 'active'
  limit 1;

  if v_center_id is null then
    raise exception '모벨 센터(slug=movel)를 찾을 수 없습니다. centers 테이블을 확인해 주세요.';
  end if;

  select m.id into v_member_id
  from public.members m
  where m.center_id = v_center_id
    and regexp_replace(m.phone, '\D', '', 'g') = v_phone_digits;

  if v_member_id is null then
    insert into public.members (
      center_id,
      name,
      phone,
      total_sessions,
      remaining_sessions,
      payment_amount,
      registered_at,
      status
    )
    values (
      v_center_id,
      v_name,
      v_phone,
      0,
      0,
      0,
      current_date,
      'active'
    )
    returning id into v_member_id;
  else
    update public.members
    set name = v_name, status = 'active', updated_at = now()
    where id = v_member_id;
  end if;

  insert into public.member_credentials (member_id, center_id, password_hash)
  values (
    v_member_id,
    v_center_id,
    extensions.crypt(v_password, extensions.gen_salt('bf'))
  )
  on conflict (member_id) do update
  set
    center_id = excluded.center_id,
    password_hash = extensions.crypt(v_password, extensions.gen_salt('bf')),
    updated_at = now();

  insert into public.reward_balances (member_id, center_id, move_score, move_mile)
  values (v_member_id, v_center_id, 0, 10000)
  on conflict (member_id) do update
  set
    center_id = excluded.center_id,
    move_mile = 10000,
    updated_at = now();

  v_user_id := public.ensure_platform_user_for_member(v_member_id);

  insert into public.user_growth_balances (user_id, current_acorns, total_growth)
  values (v_user_id, 9999, 5000)
  on conflict (user_id) do update
  set
    current_acorns = 9999,
    total_growth = 5000,
    updated_at = now();

  perform public.ensure_slg_village_for_user(v_user_id);
end;
$$;
