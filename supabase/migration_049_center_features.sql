-- MotionHub: 센터 이용 권한(기능) 관리 + 플랫폼 목록에 features 포함
-- migration_048 이후 실행

create or replace function public.list_centers_for_platform(
  p_session_token text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  ) then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  return json_build_object(
    'ok', true,
    'centers', coalesce(
      (
        select json_agg(
          json_build_object(
            'id', c.id,
            'name', c.name,
            'slug', c.slug,
            'status', c.status,
            'plan_code', sp.code,
            'member_count', (
              select count(*)::int from public.members m where m.center_id = c.id
            ),
            'trainer_count', (
              select count(*)::int
              from public.trainers t
              where t.center_id = c.id and t.is_active = true
            ),
            'features', coalesce(
              (
                select json_object_agg(cf.feature_key, cf.enabled)
                from public.center_features cf
                where cf.center_id = c.id
              ),
              '{}'::json
            ),
            'created_at', c.created_at
          )
          order by c.created_at desc
        )
        from public.centers c
        left join public.subscription_plans sp on sp.id = c.plan_id
        where c.deleted_at is null
      ),
      '[]'::json
    )
  );
end;
$$;

create or replace function public.update_center_features(
  p_session_token text,
  p_center_id uuid,
  p_features jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_enabled boolean;
  v_allowed text[] := array['mileage', 'contracts', 'notifications'];
begin
  if not exists (
    select 1
    from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  ) then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if p_center_id is null or p_features is null or jsonb_typeof(p_features) <> 'object' then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  if not exists (
    select 1 from public.centers where id = p_center_id and deleted_at is null
  ) then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  for v_key, v_enabled in
    select key, value::text::boolean
    from jsonb_each(p_features)
  loop
    if v_key = any (v_allowed) then
      insert into public.center_features (center_id, feature_key, enabled)
      values (p_center_id, v_key, coalesce(v_enabled, false))
      on conflict (center_id, feature_key)
      do update set enabled = excluded.enabled, updated_at = now();
    end if;
  end loop;

  return json_build_object(
    'ok', true,
    'center_id', p_center_id,
    'features', (
      select coalesce(json_object_agg(feature_key, enabled), '{}'::json)
      from public.center_features
      where center_id = p_center_id
    )
  );
end;
$$;

revoke all on function public.update_center_features(text, uuid, jsonb) from public;
grant execute on function public.update_center_features(text, uuid, jsonb) to anon, authenticated;
