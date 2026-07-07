-- Launch Week 1: 민감 RPC 세션 토큰 검증 (P0)
-- 적용 후 클라이언트는 p_session_token 을 함께 전달해야 합니다.

-- ---------------------------------------------------------------------------
-- 1. 회원 비밀번호 초기화 — 관리자 세션 + 동일 센터 회원만
-- ---------------------------------------------------------------------------
drop function if exists public.reset_member_password_to_default(uuid);

create or replace function public.reset_member_password_to_default(
  p_session_token text,
  p_member_id uuid
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_member public.members%rowtype;
  v_default_password text;
  v_center_id uuid;
  v_session_center_id uuid;
begin
  if p_session_token is null or trim(p_session_token) = '' or p_member_id is null then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  select s.center_id into v_session_center_id
  from public.verify_auth_session(p_session_token, 'center_user', 'admin') s
  limit 1;

  if v_session_center_id is null then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select * into v_member from public.members where id = p_member_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_member.center_id is distinct from v_session_center_id then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_center_id := v_member.center_id;

  v_default_password := public.member_phone_last_four(v_member.phone);
  if length(v_default_password) < 4 then
    v_default_password := '0000';
  end if;

  insert into public.member_credentials (member_id, center_id, password_hash)
  values (
    v_member.id,
    v_center_id,
    extensions.crypt(v_default_password, extensions.gen_salt('bf'))
  )
  on conflict (member_id) do update
  set
    center_id = excluded.center_id,
    password_hash = extensions.crypt(
      v_default_password,
      extensions.gen_salt('bf')
    ),
    updated_at = now();

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.reset_member_password_to_default(text, uuid) from public;
grant execute on function public.reset_member_password_to_default(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. 트레이너 관리자 계정 — 센터 관리자 세션 필수
-- ---------------------------------------------------------------------------
drop function if exists public.list_trainer_admin_accounts(uuid);

create or replace function public.list_trainer_admin_accounts(
  p_session_token text,
  p_center_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_center_id uuid;
  v_session_center_id uuid;
begin
  if p_session_token is null or trim(p_session_token) = '' then
    return '[]'::json;
  end if;

  select s.center_id into v_session_center_id
  from public.verify_auth_session(p_session_token, 'center_user', 'admin') s
  limit 1;

  if v_session_center_id is null then
    return '[]'::json;
  end if;

  v_center_id := coalesce(p_center_id, v_session_center_id);

  if v_center_id is distinct from v_session_center_id then
    return '[]'::json;
  end if;

  return coalesce(
    (
      select json_agg(
        json_build_object(
          'admin_user_id', cu.id,
          'center_user_id', cu.id,
          'trainer_id', cu.trainer_id,
          'username', cu.username,
          'created_at', cu.created_at
        )
        order by cu.username
      )
      from public.center_users cu
      where cu.role = 'trainer'
        and cu.trainer_id is not null
        and cu.center_id = v_center_id
    ),
    '[]'::json
  );
end;
$$;

drop function if exists public.upsert_trainer_admin_account(uuid, text, text);

create or replace function public.upsert_trainer_admin_account(
  p_session_token text,
  p_trainer_id uuid,
  p_username text,
  p_password text
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_username text := lower(trim(p_username));
  v_existing public.center_users%rowtype;
  v_trainer_exists boolean;
  v_center_id uuid;
  v_session_center_id uuid;
begin
  if p_session_token is null or trim(p_session_token) = '' then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select s.center_id into v_session_center_id
  from public.verify_auth_session(p_session_token, 'center_user', 'admin') s
  limit 1;

  if v_session_center_id is null then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if p_trainer_id is null then
    return json_build_object('ok', false, 'error', '트레이너를 지정해 주세요.');
  end if;

  if v_username is null or v_username = '' then
    return json_build_object('ok', false, 'error', '로그인 아이디를 입력해 주세요.');
  end if;

  if p_password is null or length(p_password) < 4 then
    return json_build_object('ok', false, 'error', '비밀번호는 4자 이상이어야 합니다.');
  end if;

  select exists(
    select 1 from public.trainers where id = p_trainer_id and is_active = true
  ) into v_trainer_exists;

  if not v_trainer_exists then
    return json_build_object('ok', false, 'error', '활성 트레이너를 찾을 수 없습니다.');
  end if;

  select center_id into v_center_id
  from public.trainers
  where id = p_trainer_id;

  if v_center_id is null or v_center_id is distinct from v_session_center_id then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  if exists (
    select 1
    from public.center_users
    where center_id = v_center_id
      and username = v_username
      and not (role = 'trainer' and trainer_id = p_trainer_id)
  ) then
    return json_build_object('ok', false, 'error', '이미 사용 중인 로그인 아이디입니다.');
  end if;

  select * into v_existing
  from public.center_users
  where role = 'trainer' and trainer_id = p_trainer_id
  limit 1;

  if found then
    update public.center_users
    set
      username = v_username,
      password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
      center_id = v_center_id,
      status = 'active'
    where id = v_existing.id;

    return json_build_object(
      'ok', true,
      'admin_user_id', v_existing.id,
      'center_user_id', v_existing.id,
      'trainer_id', p_trainer_id,
      'username', v_username
    );
  end if;

  insert into public.center_users (
    center_id, username, password_hash, role, trainer_id, status
  ) values (
    v_center_id,
    v_username,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    'trainer',
    p_trainer_id,
    'active'
  )
  returning * into v_existing;

  return json_build_object(
    'ok', true,
    'admin_user_id', v_existing.id,
    'center_user_id', v_existing.id,
    'trainer_id', p_trainer_id,
    'username', v_username
  );
end;
$$;

drop function if exists public.delete_trainer_admin_account(uuid);

create or replace function public.delete_trainer_admin_account(
  p_session_token text,
  p_trainer_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_center_id uuid;
  v_center_id uuid;
  v_deleted int;
begin
  if p_session_token is null or trim(p_session_token) = '' or p_trainer_id is null then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select s.center_id into v_session_center_id
  from public.verify_auth_session(p_session_token, 'center_user', 'admin') s
  limit 1;

  if v_session_center_id is null then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select center_id into v_center_id from public.trainers where id = p_trainer_id;

  if v_center_id is null or v_center_id is distinct from v_session_center_id then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  delete from public.center_users
  where role = 'trainer' and trainer_id = p_trainer_id and center_id = v_center_id;
  get diagnostics v_deleted = row_count;

  if v_deleted = 0 then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.list_trainer_admin_accounts(text, uuid) from public;
grant execute on function public.list_trainer_admin_accounts(text, uuid) to anon, authenticated;

revoke all on function public.upsert_trainer_admin_account(text, uuid, text, text) from public;
grant execute on function public.upsert_trainer_admin_account(text, uuid, text, text) to anon, authenticated;

revoke all on function public.delete_trainer_admin_account(text, uuid) from public;
grant execute on function public.delete_trainer_admin_account(text, uuid) to anon, authenticated;
