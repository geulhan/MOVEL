-- 회원 로그인 (휴대폰 + 비밀번호) / member_credentials
-- Supabase SQL Editor에서 실행하세요.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.member_credentials (
  member_id uuid primary key references public.members (id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.member_credentials enable row level security;
-- anon/authenticated 직접 조회 차단 (policy 없음)

create or replace function public.member_phone_last_four(p_phone text)
returns text
language sql
immutable
as $$
  select right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 4);
$$;

create or replace function public.create_member_credentials()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_default_password text;
begin
  v_default_password := public.member_phone_last_four(new.phone);
  if length(v_default_password) < 4 then
    v_default_password := '0000';
  end if;

  insert into public.member_credentials (member_id, password_hash)
  values (
    new.id,
    extensions.crypt(v_default_password, extensions.gen_salt('bf'))
  )
  on conflict (member_id) do nothing;

  return new;
end;
$$;

drop trigger if exists members_create_credentials on public.members;
create trigger members_create_credentials
  after insert on public.members
  for each row
  execute function public.create_member_credentials();

-- 기존 회원 비밀번호 백필 (휴대폰 뒤 4자리)
insert into public.member_credentials (member_id, password_hash)
select
  m.id,
  extensions.crypt(
    case
      when length(public.member_phone_last_four(m.phone)) >= 4
        then public.member_phone_last_four(m.phone)
      else '0000'
    end,
    extensions.gen_salt('bf')
  )
from public.members m
where not exists (
  select 1 from public.member_credentials c where c.member_id = m.id
);

create or replace function public.verify_member_login(
  p_phone text,
  p_password text
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_member public.members%rowtype;
  v_hash text;
  v_token text;
  v_digits text;
begin
  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if v_digits = '' or p_password is null or p_password = '' then
    return json_build_object('ok', false);
  end if;

  select * into v_member
  from public.members
  where regexp_replace(phone, '\D', '', 'g') = v_digits;

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

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  return json_build_object(
    'ok', true,
    'id', v_member.id,
    'name', v_member.name,
    'phone', v_member.phone,
    'token', v_token
  );
end;
$$;

create or replace function public.change_member_password(
  p_phone text,
  p_old_password text,
  p_new_password text
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_member public.members%rowtype;
  v_hash text;
  v_digits text;
begin
  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  if v_digits = '' or p_old_password is null or p_new_password is null then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  if length(p_new_password) < 4 then
    return json_build_object('ok', false, 'error', 'too_short');
  end if;

  select * into v_member
  from public.members
  where regexp_replace(phone, '\D', '', 'g') = v_digits;

  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  select password_hash into v_hash
  from public.member_credentials
  where member_id = v_member.id;

  if v_hash is null or v_hash <> extensions.crypt(p_old_password, v_hash) then
    return json_build_object('ok', false, 'error', 'wrong_password');
  end if;

  update public.member_credentials
  set
    password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
    updated_at = now()
  where member_id = v_member.id;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.verify_member_login(text, text) from public;
grant execute on function public.verify_member_login(text, text) to anon, authenticated;

revoke all on function public.change_member_password(text, text, text) from public;
grant execute on function public.change_member_password(text, text, text) to anon, authenticated;
