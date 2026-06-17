-- MotionHub Super Admin: 피드백·활동 로그·플랫폼 대시보드 RPC
-- Supabase SQL Editor에서 실행

-- ---------------------------------------------------------------------------
-- 1. platform_feedback
-- ---------------------------------------------------------------------------
create table if not exists public.platform_feedback (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  created_by text not null default '',
  created_by_type text not null default 'admin'
    check (created_by_type in ('admin', 'trainer', 'member')),
  type text not null
    check (type in ('bug', 'feature', 'improvement', 'question')),
  title text not null,
  content text not null default '',
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'planned', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_feedback_center_id_idx
  on public.platform_feedback (center_id);
create index if not exists platform_feedback_status_idx
  on public.platform_feedback (status, created_at desc);

alter table public.platform_feedback enable row level security;

-- ---------------------------------------------------------------------------
-- 2. platform_activity_logs
-- ---------------------------------------------------------------------------
create table if not exists public.platform_activity_logs (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  actor_type text not null default 'system'
    check (actor_type in ('admin', 'trainer', 'member', 'system')),
  actor_id text,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_activity_logs_center_id_idx
  on public.platform_activity_logs (center_id, created_at desc);
create index if not exists platform_activity_logs_action_idx
  on public.platform_activity_logs (action, created_at desc);

alter table public.platform_activity_logs enable row level security;

-- ---------------------------------------------------------------------------
-- 3. 활동 로그 기록 (클라이언트 → RPC)
-- ---------------------------------------------------------------------------
create or replace function public.log_platform_activity(
  p_center_id uuid,
  p_action text,
  p_actor_type text default 'system',
  p_actor_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_center_id is null or coalesce(trim(p_action), '') = '' then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  if not exists (
    select 1 from public.centers c where c.id = p_center_id and c.deleted_at is null
  ) then
    return json_build_object('ok', false, 'error', 'center_not_found');
  end if;

  insert into public.platform_activity_logs (
    center_id, actor_type, actor_id, action, metadata
  ) values (
    p_center_id,
    coalesce(nullif(trim(p_actor_type), ''), 'system'),
    nullif(trim(p_actor_id), ''),
    trim(p_action),
    coalesce(p_metadata, '{}'::jsonb)
  );

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.log_platform_activity(uuid, text, text, text, jsonb) from public;
grant execute on function public.log_platform_activity(uuid, text, text, text, jsonb)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. 피드백 제출 (센터 관리자·회원)
-- ---------------------------------------------------------------------------
create or replace function public.submit_platform_feedback(
  p_center_id uuid,
  p_created_by text,
  p_created_by_type text,
  p_type text,
  p_title text,
  p_content text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_center_id is null
    or coalesce(trim(p_title), '') = ''
    or coalesce(trim(p_content), '') = '' then
    return json_build_object('ok', false, 'error', 'invalid_input');
  end if;

  if p_type not in ('bug', 'feature', 'improvement', 'question') then
    return json_build_object('ok', false, 'error', 'invalid_type');
  end if;

  if p_created_by_type not in ('admin', 'trainer', 'member') then
    return json_build_object('ok', false, 'error', 'invalid_actor');
  end if;

  insert into public.platform_feedback (
    center_id, created_by, created_by_type, type, title, content
  ) values (
    p_center_id,
    coalesce(trim(p_created_by), 'unknown'),
    p_created_by_type,
    p_type,
    trim(p_title),
    trim(p_content)
  )
  returning id into v_id;

  perform public.log_platform_activity(
    p_center_id,
    'feedback_submitted',
    p_created_by_type,
    null,
    jsonb_build_object('feedback_id', v_id, 'type', p_type)
  );

  return json_build_object('ok', true, 'id', v_id);
end;
$$;

revoke all on function public.submit_platform_feedback(uuid, text, text, text, text, text) from public;
grant execute on function public.submit_platform_feedback(uuid, text, text, text, text, text)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. 피드백 목록·상태 변경 (슈퍼관리자)
-- ---------------------------------------------------------------------------
create or replace function public.list_platform_feedback_for_platform(
  p_session_token text,
  p_type text default null,
  p_status text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  ) then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  return json_build_object(
    'ok', true,
    'items', coalesce(
      (
        select json_agg(row_to_json(t) order by t.created_at desc)
        from (
          select
            f.id,
            f.center_id,
            c.name as center_name,
            c.slug as center_slug,
            f.created_by,
            f.created_by_type,
            f.type,
            f.title,
            f.content,
            f.status,
            f.created_at
          from public.platform_feedback f
          join public.centers c on c.id = f.center_id
          where c.deleted_at is null
            and (p_type is null or f.type = p_type)
            and (p_status is null or f.status = p_status)
          order by f.created_at desc
          limit 500
        ) t
      ),
      '[]'::json
    )
  );
end;
$$;

create or replace function public.update_platform_feedback_status(
  p_session_token text,
  p_feedback_id uuid,
  p_status text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  ) then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if p_status not in ('open', 'reviewing', 'planned', 'completed') then
    return json_build_object('ok', false, 'error', 'invalid_status');
  end if;

  update public.platform_feedback
  set status = p_status, updated_at = now()
  where id = p_feedback_id;

  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.list_platform_feedback_for_platform(text, text, text) from public;
grant execute on function public.list_platform_feedback_for_platform(text, text, text)
  to anon, authenticated;

revoke all on function public.update_platform_feedback_status(text, uuid, text) from public;
grant execute on function public.update_platform_feedback_status(text, uuid, text)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. 플랫폼 대시보드 스냅샷
-- ---------------------------------------------------------------------------
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
          where cu.role = 'admin' and cu.is_active = true
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
          where m.created_at::date >= v_month_start and m.created_at::date <= v_month_end
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
              when total_cnt = 0 then 0
              else round(completed_cnt::numeric / total_cnt * 100, 1)
            end as value
          from public.centers c
          left join lateral (
            select
              count(*) filter (where ps.status = 'completed')::int as completed_cnt,
              count(*) filter (where ps.status in ('completed', 'cancelled', 'no_show'))::int as total_cnt
            from public.pt_schedules ps
            where ps.center_id = c.id
              and ps.scheduled_at >= (now() - interval '30 days')
          ) stats on true
          where c.deleted_at is null
          group by c.id, c.name, c.slug, completed_cnt, total_cnt
          having total_cnt > 0
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
              when total_cnt = 0 then 0
              else round((completed_cnt + scheduled_cnt)::numeric / total_cnt * 100, 1)
            end as value
          from public.centers c
          left join lateral (
            select
              count(*) filter (where ps.status = 'completed')::int as completed_cnt,
              count(*) filter (where ps.status = 'scheduled')::int as scheduled_cnt,
              count(*)::int as total_cnt
            from public.pt_schedules ps
            where ps.center_id = c.id
              and ps.scheduled_at >= (now() - interval '30 days')
          ) stats on true
          where c.deleted_at is null
          group by c.id, c.name, c.slug, completed_cnt, scheduled_cnt, total_cnt
          having total_cnt > 0
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
end;
$$;

revoke all on function public.get_platform_dashboard_snapshot(text) from public;
grant execute on function public.get_platform_dashboard_snapshot(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. 센터 상세 (플랫폼 읽기 전용)
-- ---------------------------------------------------------------------------
create or replace function public.get_center_detail_for_platform(
  p_session_token text,
  p_center_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month_start date;
  v_month_end date;
  v_center json;
begin
  if not exists (
    select 1 from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  ) then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  v_month_start := date_trunc('month', (now() at time zone 'Asia/Seoul'))::date;
  v_month_end := (date_trunc('month', (now() at time zone 'Asia/Seoul')) + interval '1 month - 1 day')::date;

  select json_build_object(
    'id', c.id,
    'name', c.name,
    'slug', c.slug,
    'status', c.status,
    'created_at', c.created_at,
    'service_starts_at', c.service_starts_at,
    'service_ends_at', c.service_ends_at,
    'service_period_ok', public.center_service_period_ok(c),
    'beta_trial', coalesce((c.settings->>'beta_trial')::boolean, false),
    'plan_code', sp.code,
    'contact_email', c.contact_email,
    'contact_phone', c.contact_phone
  )
  into v_center
  from public.centers c
  left join public.subscription_plans sp on sp.id = c.plan_id
  where c.id = p_center_id and c.deleted_at is null;

  if v_center is null then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  return json_build_object(
    'ok', true,
    'center', v_center,
    'operations', (
      select json_build_object(
        'member_count', count(*)::int,
        'active_members', count(*) filter (where m.status = 'active')::int,
        'dormant_members', count(*) filter (where m.status = 'dormant')::int,
        'trainer_count', (
          select count(*)::int from public.trainers t
          where t.center_id = p_center_id and t.is_active = true
        ),
        'schedule_count', (
          select count(*)::int from public.pt_schedules ps
          where ps.center_id = p_center_id
            and ps.scheduled_at >= (now() - interval '30 days')
        ),
        'attendance_rate', (
          select case
            when count(*) filter (where ps.status in ('completed', 'cancelled', 'no_show')) = 0 then 0
            else round(
              count(*) filter (where ps.status = 'completed')::numeric
              / count(*) filter (where ps.status in ('completed', 'cancelled', 'no_show')) * 100,
              1
            )
          end
          from public.pt_schedules ps
          where ps.center_id = p_center_id
            and ps.scheduled_at >= (now() - interval '30 days')
        ),
        'noshow_rate', (
          select case
            when count(*) filter (where ps.status in ('completed', 'no_show', 'cancelled')) = 0 then 0
            else round(
              count(*) filter (where ps.status = 'no_show')::numeric
              / count(*) filter (where ps.status in ('completed', 'no_show', 'cancelled')) * 100,
              1
            )
          end
          from public.pt_schedules ps
          where ps.center_id = p_center_id
            and ps.scheduled_at >= (now() - interval '30 days')
        )
      )
      from public.members m
      where m.center_id = p_center_id
    ),
    'finance', (
      select json_build_object(
        'total_revenue', coalesce(sum(ph.amount), 0)::bigint,
        'month_revenue', coalesce(sum(ph.amount) filter (
          where ph.paid_at::date >= v_month_start and ph.paid_at::date <= v_month_end
        ), 0)::bigint,
        'recognized_revenue', coalesce(sum(ph.amount) filter (
          where ph.paid_at::date >= v_month_start and ph.paid_at::date <= v_month_end
        ), 0)::bigint,
        'prepaid_estimate', coalesce((
          select sum(
            case when m.total_sessions > 0 then
              (m.remaining_sessions::numeric / m.total_sessions)
              * coalesce((
                select sum(p2.amount) from public.payment_history p2
                where p2.member_id = m.id and p2.sessions > 0
              ), 0)
            else 0 end
          )::bigint
          from public.members m
          where m.center_id = p_center_id and m.status != 'terminated'
        ), 0),
        'refund_estimate', 0
      )
      from public.payment_history ph
      where ph.center_id = p_center_id
    ),
    'messaging', coalesce(public.get_message_credit_summary(p_center_id), '{}'::json),
    'messaging_usage', (
      select json_build_object(
        'month_total', count(*) filter (
          where ml.status = 'sent'
            and ml.created_at::date >= v_month_start
            and ml.created_at::date <= v_month_end
        )::int,
        'month_auto', count(*) filter (
          where ml.status = 'sent'
            and ml.template_key in ('welcome', 'payment_done', 'renewal', 'pt_reminder', 'step_verification_result')
            and ml.created_at::date >= v_month_start
            and ml.created_at::date <= v_month_end
        )::int,
        'month_campaign', count(*) filter (
          where ml.status = 'sent'
            and (ml.metadata->>'campaign') is not null
            and ml.created_at::date >= v_month_start
            and ml.created_at::date <= v_month_end
        )::int
      )
      from public.message_logs ml
      where ml.center_id = p_center_id
    ),
    'recent_activity', coalesce((
      select json_agg(row_to_json(t))
      from (
        select a.action, a.actor_type, a.metadata, a.created_at
        from public.platform_activity_logs a
        where a.center_id = p_center_id
        order by a.created_at desc
        limit 20
      ) t
    ), '[]'::json)
  );
end;
$$;

revoke all on function public.get_center_detail_for_platform(text, uuid) from public;
grant execute on function public.get_center_detail_for_platform(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. 플랫폼 사용 현황 분석 (최근 30일)
-- ---------------------------------------------------------------------------
create or replace function public.get_platform_analytics(
  p_session_token text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  ) then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  return json_build_object(
    'ok', true,
    'feature_totals', (
      select json_build_object(
        'member_manage', count(*) filter (where a.action in ('member_created', 'member_updated'))::int,
        'schedule', count(*) filter (where a.action in ('schedule_created', 'schedule_completed', 'schedule_cancelled'))::int,
        'attendance', count(*) filter (where a.action in ('attendance_checkin', 'attendance_processed'))::int,
        'journal', count(*) filter (where a.action = 'journal_created')::int,
        'message', count(*) filter (where a.action in ('message_sent', 'feedback_submitted'))::int,
        'payment', count(*) filter (where a.action = 'payment_registered')::int,
        'analytics', count(*) filter (where a.action = 'analytics_viewed')::int
      )
      from public.platform_activity_logs a
      where a.created_at >= now() - interval '30 days'
    ),
    'centers', coalesce((
      select json_agg(row_to_json(t))
      from (
        select
          c.id,
          c.name,
          c.slug,
          count(*) filter (where a.action in ('member_created', 'member_updated'))::int as member_manage,
          count(*) filter (where a.action in ('schedule_created', 'schedule_completed', 'schedule_cancelled'))::int as schedule,
          count(*) filter (where a.action in ('attendance_checkin', 'attendance_processed'))::int as attendance,
          count(*) filter (where a.action = 'journal_created')::int as journal,
          count(*) filter (where a.action in ('message_sent', 'feedback_submitted'))::int as message,
          count(*) filter (where a.action = 'payment_registered')::int as payment,
          count(*) filter (where a.action = 'analytics_viewed')::int as analytics
        from public.centers c
        left join public.platform_activity_logs a
          on a.center_id = c.id and a.created_at >= now() - interval '30 days'
        where c.deleted_at is null
        group by c.id, c.name, c.slug
        order by c.name
      ) t
    ), '[]'::json)
  );
end;
$$;

revoke all on function public.get_platform_analytics(text) from public;
grant execute on function public.get_platform_analytics(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. 베타 센터 목록
-- ---------------------------------------------------------------------------
create or replace function public.list_beta_centers_for_platform(
  p_session_token text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  ) then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  return json_build_object(
    'ok', true,
    'centers', coalesce((
      select json_agg(row_to_json(t) order by t.service_starts_at nulls last)
      from (
        select
          c.id,
          c.name,
          c.slug,
          c.status,
          c.service_starts_at,
          c.service_ends_at,
          case
            when c.service_ends_at is null then null
            else greatest(
              0,
              (c.service_ends_at::date - (now() at time zone 'Asia/Seoul')::date)
            )
          end as days_remaining,
          coalesce(max(a.created_at), c.created_at) as last_activity_at
        from public.centers c
        left join public.platform_activity_logs a on a.center_id = c.id
        where c.deleted_at is null
          and (
            coalesce((c.settings->>'beta_trial')::boolean, false) = true
            or c.status = 'inactive'
          )
        group by c.id, c.name, c.slug, c.status, c.service_starts_at, c.service_ends_at, c.created_at
      ) t
    ), '[]'::json)
  );
end;
$$;

revoke all on function public.list_beta_centers_for_platform(text) from public;
grant execute on function public.list_beta_centers_for_platform(text) to anon, authenticated;
