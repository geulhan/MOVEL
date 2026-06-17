-- 플랫폼 대시보드 RPC 수정
-- center_users: role = center_admin, status = active (is_active 컬럼 없음)
-- Supabase SQL Editor에서 실행

create or replace function public.get_platform_dashboard_snapshot(
  p_session_token text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month_start date;
  v_month_end date;
begin
  if not exists (
    select 1 from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  ) then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  v_month_start := date_trunc('month', (now() at time zone 'Asia/Seoul'))::date;
  v_month_end := (date_trunc('month', (now() at time zone 'Asia/Seoul')) + interval '1 month - 1 day')::date;

  return json_build_object(
    'ok', true,
    'kpi', (
      select json_build_object(
        'total_centers', count(*)::int,
        'active_centers', count(*) filter (
          where c.status = 'active' and public.center_service_period_ok(c)
        )::int,
        'beta_centers', count(*) filter (
          where coalesce((c.settings->>'beta_trial')::boolean, false) = true
            or c.status = 'inactive'
        )::int,
        'expired_centers', count(*) filter (
          where c.status = 'active'
            and c.service_ends_at is not null
            and c.service_ends_at::date < (now() at time zone 'Asia/Seoul')::date
        )::int,
        'total_members', coalesce((
          select count(*)::int from public.members m
          join public.centers cc on cc.id = m.center_id and cc.deleted_at is null
        ), 0),
        'total_admins', coalesce((
          select count(*)::int from public.center_users cu
          join public.centers cc on cc.id = cu.center_id and cc.deleted_at is null
          where cu.role = 'center_admin' and cu.status = 'active'
        ), 0),
        'total_trainers', coalesce((
          select count(*)::int from public.trainers t
          join public.centers cc on cc.id = t.center_id and cc.deleted_at is null
          where t.is_active = true
        ), 0)
      )
      from public.centers c
      where c.deleted_at is null
    ),
    'monthly', (
      select json_build_object(
        'new_centers', count(*) filter (
          where c.created_at::date >= v_month_start and c.created_at::date <= v_month_end
        )::int,
        'new_members', coalesce((
          select count(*)::int
          from public.members m
          join public.centers cc on cc.id = m.center_id and cc.deleted_at is null
          where coalesce(m.created_at::date, m.registered_at) >= v_month_start
            and coalesce(m.created_at::date, m.registered_at) <= v_month_end
        ), 0),
        'payment_count', coalesce((
          select count(*)::int
          from public.payment_history ph
          join public.centers cc on cc.id = ph.center_id and cc.deleted_at is null
          where ph.paid_at::date >= v_month_start and ph.paid_at::date <= v_month_end
        ), 0),
        'payment_revenue', coalesce((
          select coalesce(sum(ph.amount), 0)::bigint
          from public.payment_history ph
          join public.centers cc on cc.id = ph.center_id and cc.deleted_at is null
          where ph.paid_at::date >= v_month_start and ph.paid_at::date <= v_month_end
        ), 0),
        'message_usage', coalesce((
          select count(*)::int
          from public.message_logs ml
          join public.centers cc on cc.id = ml.center_id and cc.deleted_at is null
          where ml.status = 'sent'
            and ml.created_at::date >= v_month_start
            and ml.created_at::date <= v_month_end
        ), 0)
      )
      from public.centers c
      where c.deleted_at is null
    ),
    'rankings', json_build_object(
      'members', coalesce((
        select json_agg(row_to_json(t))
        from (
          select c.name, c.slug, count(m.id)::int as value
          from public.centers c
          left join public.members m on m.center_id = c.id
          where c.deleted_at is null
          group by c.id, c.name, c.slug
          order by value desc
          limit 10
        ) t
      ), '[]'::json),
      'revenue', coalesce((
        select json_agg(row_to_json(t))
        from (
          select c.name, c.slug, coalesce(sum(ph.amount), 0)::bigint as value
          from public.centers c
          left join public.payment_history ph
            on ph.center_id = c.id
            and ph.paid_at::date >= v_month_start
            and ph.paid_at::date <= v_month_end
          where c.deleted_at is null
          group by c.id, c.name, c.slug
          order by value desc
          limit 10
        ) t
      ), '[]'::json),
      'attendance', coalesce((
        select json_agg(row_to_json(t))
        from (
          select
            c.name,
            c.slug,
            case
              when stats.total_cnt = 0 then 0
              else round(stats.completed_cnt::numeric / stats.total_cnt * 100, 1)
            end as value
          from public.centers c
          cross join lateral (
            select
              count(*) filter (where ps.status = 'completed')::int as completed_cnt,
              count(*) filter (where ps.status in ('completed', 'cancelled', 'no_show'))::int as total_cnt
            from public.pt_schedules ps
            where ps.center_id = c.id
              and ps.scheduled_at >= (now() - interval '30 days')
          ) stats
          where c.deleted_at is null and stats.total_cnt > 0
          order by value desc
          limit 10
        ) t
      ), '[]'::json),
      'booking', coalesce((
        select json_agg(row_to_json(t))
        from (
          select
            c.name,
            c.slug,
            case
              when stats.total_cnt = 0 then 0
              else round((stats.completed_cnt + stats.scheduled_cnt)::numeric / stats.total_cnt * 100, 1)
            end as value
          from public.centers c
          cross join lateral (
            select
              count(*) filter (where ps.status = 'completed')::int as completed_cnt,
              count(*) filter (where ps.status = 'scheduled')::int as scheduled_cnt,
              count(*)::int as total_cnt
            from public.pt_schedules ps
            where ps.center_id = c.id
              and ps.scheduled_at >= (now() - interval '30 days')
          ) stats
          where c.deleted_at is null and stats.total_cnt > 0
          order by value desc
          limit 10
        ) t
      ), '[]'::json)
    ),
    'beta_alerts', json_build_object(
      'inactive_7d', coalesce((
        select json_agg(row_to_json(t))
        from (
          select c.id, c.name, c.slug,
            coalesce(max(a.created_at), c.created_at) as last_activity_at
          from public.centers c
          left join public.platform_activity_logs a on a.center_id = c.id
          where c.deleted_at is null
            and coalesce((c.settings->>'beta_trial')::boolean, false) = true
          group by c.id, c.name, c.slug, c.created_at
          having coalesce(max(a.created_at), c.created_at) < now() - interval '7 days'
          order by last_activity_at asc
          limit 50
        ) t
      ), '[]'::json),
      'inactive_14d', coalesce((
        select json_agg(row_to_json(t))
        from (
          select c.id, c.name, c.slug,
            coalesce(max(a.created_at), c.created_at) as last_activity_at
          from public.centers c
          left join public.platform_activity_logs a on a.center_id = c.id
          where c.deleted_at is null
            and coalesce((c.settings->>'beta_trial')::boolean, false) = true
          group by c.id, c.name, c.slug, c.created_at
          having coalesce(max(a.created_at), c.created_at) < now() - interval '14 days'
          order by last_activity_at asc
          limit 50
        ) t
      ), '[]'::json)
    ),
    'recent_activity', coalesce((
      select json_agg(row_to_json(t))
      from (
        select
          a.id,
          a.center_id,
          c.name as center_name,
          c.slug as center_slug,
          a.actor_type,
          a.actor_id,
          a.action,
          a.metadata,
          a.created_at
        from public.platform_activity_logs a
        join public.centers c on c.id = a.center_id
        where c.deleted_at is null
        order by a.created_at desc
        limit 30
      ) t
    ), '[]'::json)
  );
exception
  when others then
    return json_build_object(
      'ok', false,
      'error', 'query_failed',
      'message', SQLERRM
    );
end;
$$;

-- platform 테이블 RLS (policy 없으면 일반 쿼리 차단 — RPC는 definer지만 안전하게 추가)
drop policy if exists platform_feedback_all on public.platform_feedback;
create policy platform_feedback_all on public.platform_feedback
  for all using (true) with check (true);

drop policy if exists platform_activity_logs_all on public.platform_activity_logs;
create policy platform_activity_logs_all on public.platform_activity_logs
  for all using (true) with check (true);
