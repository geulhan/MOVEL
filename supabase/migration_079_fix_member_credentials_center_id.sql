-- member_credentials.center_id NOT NULL 오류 수정
-- - 회원 등록 트리거 (migration_037 미적용 환경 포함)
-- - 비밀번호 초기화 RPC (migration_018 center_id 누락)
-- - 센터별 전화번호 중복 조회 RPC

-- ---------------------------------------------------------------------------
-- 1. 회원 등록 시 credentials 생성 (center_id 필수)
-- ---------------------------------------------------------------------------

create or replace function public.create_member_credentials()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_default_password text;
  v_center_id uuid;
begin
  v_default_password := public.member_phone_last_four(new.phone);
  if length(v_default_password) < 4 then
    v_default_password := '0000';
  end if;

  v_center_id := new.center_id;
  if v_center_id is null then
    select public.get_default_center_id() into v_center_id;
  end if;

  if v_center_id is null then
    raise exception 'member_credentials requires center_id (member %)', new.id
      using errcode = '23502';
  end if;

  insert into public.member_credentials (member_id, center_id, password_hash)
  values (
    new.id,
    v_center_id,
    extensions.crypt(v_default_password, extensions.gen_salt('bf'))
  )
  on conflict (member_id) do update
  set
    center_id = excluded.center_id,
    password_hash = excluded.password_hash,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists members_create_credentials on public.members;
create trigger members_create_credentials
  after insert on public.members
  for each row
  execute function public.create_member_credentials();

-- ---------------------------------------------------------------------------
-- 2. 관리자 비밀번호 초기화 (credentials 없을 때 INSERT 경로)
-- ---------------------------------------------------------------------------

create or replace function public.reset_member_password_to_default(
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
begin
  if p_member_id is null then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  select * into v_member from public.members where id = p_member_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  v_center_id := v_member.center_id;
  if v_center_id is null then
    select public.get_default_center_id() into v_center_id;
  end if;

  if v_center_id is null then
    return json_build_object(
      'ok', false,
      'error', 'center_not_configured',
      'message', '회원 소속 센터를 확인할 수 없습니다.'
    );
  end if;

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

revoke all on function public.reset_member_password_to_default(uuid) from public;
grant execute on function public.reset_member_password_to_default(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. 센터별 전화번호 중복 조회
-- ---------------------------------------------------------------------------

create or replace function public.find_member_by_phone_in_center(
  p_center_id uuid,
  p_phone text
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id
  from public.members m
  where m.center_id = p_center_id
    and regexp_replace(m.phone, '\D', '', 'g')
      = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
  limit 1;
$$;

revoke all on function public.find_member_by_phone_in_center(uuid, text) from public;
grant execute on function public.find_member_by_phone_in_center(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. credentials 누락 회원 백필
-- ---------------------------------------------------------------------------

insert into public.member_credentials (member_id, center_id, password_hash)
select
  m.id,
  m.center_id,
  extensions.crypt(
    case
      when length(public.member_phone_last_four(m.phone)) >= 4
        then public.member_phone_last_four(m.phone)
      else '0000'
    end,
    extensions.gen_salt('bf')
  )
from public.members m
where m.center_id is not null
  and not exists (
    select 1
    from public.member_credentials mc
    where mc.member_id = m.id
  );
