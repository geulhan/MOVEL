-- 회원 등록 시 member_credentials 트리거에 center_id 반영
-- migration_032 이후 center_id NOT NULL 때문에 관리자 회원 등록이 실패할 수 있음

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
