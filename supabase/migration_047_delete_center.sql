-- MotionHub SaaS: 센터 삭제 (soft delete)
-- migration_046 이후 실행

create or replace function public.delete_center(
  p_session_token text,
  p_center_id uuid,
  p_confirm_slug text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_center public.centers%rowtype;
  v_slug text := lower(trim(coalesce(p_confirm_slug, '')));
begin
  if not exists (
    select 1
    from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  ) then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if p_center_id is null or v_slug = '' then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  select * into v_center
  from public.centers
  where id = p_center_id
    and deleted_at is null;

  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_center.slug = 'movel' then
    return json_build_object(
      'ok', false,
      'error', 'protected_center',
      'message', 'MOVEL 기본 센터는 삭제할 수 없습니다.'
    );
  end if;

  if v_center.slug <> v_slug then
    return json_build_object(
      'ok', false,
      'error', 'slug_mismatch',
      'message', '확인용 센터 코드가 일치하지 않습니다.'
    );
  end if;

  update public.centers
  set
    status = 'inactive',
    deleted_at = now(),
    updated_at = now()
  where id = p_center_id;

  delete from public.auth_sessions
  where center_id = p_center_id;

  update public.center_users
  set status = 'suspended', updated_at = now()
  where center_id = p_center_id;

  return json_build_object(
    'ok', true,
    'center_id', p_center_id,
    'center_slug', v_center.slug
  );
end;
$$;

revoke all on function public.delete_center(text, uuid, text) from public;
grant execute on function public.delete_center(text, uuid, text) to anon, authenticated;
