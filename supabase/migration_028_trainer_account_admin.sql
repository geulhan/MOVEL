-- 트레이너 로그인 계정 관리 RPC (관리자 화면용)
-- migration_027 실행 후 Supabase SQL Editor에서 실행하세요.

create unique index if not exists admin_users_trainer_id_uidx
  on public.admin_users (trainer_id)
  where role = 'trainer' and trainer_id is not null;

create or replace function public.list_trainer_admin_accounts()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce(
    (
      select json_agg(
        json_build_object(
          'admin_user_id', au.id,
          'trainer_id', au.trainer_id,
          'username', au.username,
          'created_at', au.created_at
        )
        order by au.username
      )
      from public.admin_users au
      where au.role = 'trainer'
        and au.trainer_id is not null
    ),
    '[]'::json
  );
end;
$$;

create or replace function public.upsert_trainer_admin_account(
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
  v_existing public.admin_users%rowtype;
  v_trainer_exists boolean;
begin
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

  if exists (
    select 1
    from public.admin_users
    where username = v_username
      and not (role = 'trainer' and trainer_id = p_trainer_id)
  ) then
    return json_build_object('ok', false, 'error', '이미 사용 중인 로그인 아이디입니다.');
  end if;

  select * into v_existing
  from public.admin_users
  where role = 'trainer' and trainer_id = p_trainer_id
  limit 1;

  if found then
    update public.admin_users
    set
      username = v_username,
      password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
    where id = v_existing.id;

    return json_build_object(
      'ok', true,
      'admin_user_id', v_existing.id,
      'trainer_id', p_trainer_id,
      'username', v_username,
      'created', false
    );
  end if;

  insert into public.admin_users (username, password_hash, role, trainer_id)
  values (
    v_username,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    'trainer',
    p_trainer_id
  )
  returning * into v_existing;

  return json_build_object(
    'ok', true,
    'admin_user_id', v_existing.id,
    'trainer_id', p_trainer_id,
    'username', v_username,
    'created', true
  );
end;
$$;

create or replace function public.delete_trainer_admin_account(p_trainer_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  if p_trainer_id is null then
    return json_build_object('ok', false, 'error', '트레이너를 지정해 주세요.');
  end if;

  delete from public.admin_users
  where role = 'trainer' and trainer_id = p_trainer_id;

  get diagnostics v_deleted = row_count;

  if v_deleted = 0 then
    return json_build_object('ok', false, 'error', '설정된 로그인 계정이 없습니다.');
  end if;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.list_trainer_admin_accounts() from public;
grant execute on function public.list_trainer_admin_accounts() to anon, authenticated;

revoke all on function public.upsert_trainer_admin_account(uuid, text, text) from public;
grant execute on function public.upsert_trainer_admin_account(uuid, text, text) to anon, authenticated;

revoke all on function public.delete_trainer_admin_account(uuid) from public;
grant execute on function public.delete_trainer_admin_account(uuid) to anon, authenticated;
