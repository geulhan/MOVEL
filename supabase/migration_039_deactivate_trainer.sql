-- 트레이너 비활성화(삭제) RPC
-- 로그인 계정 삭제 + is_active = false

create or replace function public.deactivate_trainer(p_trainer_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if p_trainer_id is null then
    return json_build_object('ok', false, 'error', '트레이너를 지정해 주세요.');
  end if;

  if not exists (
    select 1 from public.trainers where id = p_trainer_id and is_active = true
  ) then
    return json_build_object('ok', false, 'error', '활성 트레이너를 찾을 수 없습니다.');
  end if;

  delete from public.admin_users
  where role = 'trainer' and trainer_id = p_trainer_id;

  update public.trainers
  set is_active = false
  where id = p_trainer_id and is_active = true;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return json_build_object('ok', false, 'error', '트레이너를 찾을 수 없습니다.');
  end if;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.deactivate_trainer(uuid) from public;
grant execute on function public.deactivate_trainer(uuid) to anon, authenticated;

grant update on public.trainers to anon, authenticated;
