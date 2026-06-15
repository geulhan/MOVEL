-- MotionHub: 베타 14일 자동 부여, 가입 동의 저장, 플랫폼 계정·동의 조회
-- migration_054 이후 실행

alter table public.center_users
  add column if not exists phone text;

comment on column public.center_users.phone is
  '관리자·트레이너 연락처 (비밀번호 초기화 시 뒤 4자리 사용)';

create table if not exists public.signup_consent_records (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('member', 'center_admin')),
  center_id uuid references public.centers (id) on delete set null,
  member_id uuid references public.members (id) on delete set null,
  center_user_id uuid references public.center_users (id) on delete set null,
  name text,
  phone text,
  email text,
  agree_age boolean not null default false,
  agree_terms boolean not null default false,
  agree_privacy boolean not null default false,
  agree_marketing boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists signup_consent_records_created_at_idx
  on public.signup_consent_records (created_at desc);

create index if not exists signup_consent_records_center_id_idx
  on public.signup_consent_records (center_id);

alter table public.signup_consent_records enable row level security;

-- ---------------------------------------------------------------------------
-- 센터 자가 등록: 베타 14일 + 연락처 필수 + 동의 저장
-- ---------------------------------------------------------------------------
create or replace function public.self_register_center(
  p_name text,
  p_slug text,
  p_admin_username text,
  p_admin_password text,
  p_contact_email text default null,
  p_contact_phone text default null,
  p_agree_age boolean default false,
  p_agree_terms boolean default false,
  p_agree_privacy boolean default false,
  p_agree_marketing boolean default false
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_center_id uuid;
  v_plan_id uuid;
  v_slug text;
  v_username text;
  v_admin_id uuid;
  v_phone_digits text;
  v_today date := public.center_local_today();
  v_default_theme jsonb := jsonb_build_object(
    'sidebarBg', '#1c1c1c',
    'sidebarText', '#f5f0e8',
    'sidebarMuted', 'rgba(245,240,232,0.65)',
    'accent', '#c8b882',
    'accentDark', '#a89868',
    'mainBg', '#f5f0e8',
    'mainText', '#1c1c1c',
    'tabActiveBg', 'rgba(200,184,130,0.22)',
    'tabActiveText', '#c8b882'
  );
begin
  if trim(coalesce(p_name, '')) = '' then
    return json_build_object('ok', false, 'error', 'invalid_name');
  end if;

  v_slug := lower(trim(coalesce(p_slug, '')));
  if v_slug = '' or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    return json_build_object(
      'ok', false,
      'error', 'invalid_slug',
      'message', '센터 주소는 영문 소문자·숫자·하이픈만 사용할 수 있습니다.'
    );
  end if;

  if v_slug = 'movel' then
    return json_build_object('ok', false, 'error', 'reserved_slug');
  end if;

  if exists (select 1 from public.centers where slug = v_slug and deleted_at is null) then
    return json_build_object('ok', false, 'error', 'slug_taken');
  end if;

  v_username := lower(trim(coalesce(p_admin_username, '')));
  if v_username = '' then
    return json_build_object('ok', false, 'error', 'invalid_admin_username');
  end if;

  if p_admin_password is null or length(p_admin_password) < 4 then
    return json_build_object('ok', false, 'error', 'invalid_admin_password');
  end if;

  v_phone_digits := regexp_replace(coalesce(p_contact_phone, ''), '\D', '', 'g');
  if length(v_phone_digits) <> 11 or left(v_phone_digits, 3) <> '010' then
    return json_build_object(
      'ok', false,
      'error', 'invalid_phone',
      'message', '010으로 시작하는 11자리 휴대전화번호를 입력해 주세요.'
    );
  end if;

  if coalesce(p_agree_age, false) is not true
     or coalesce(p_agree_terms, false) is not true
     or coalesce(p_agree_privacy, false) is not true then
    return json_build_object(
      'ok', false,
      'error', 'consent_required',
      'message', '필수 약관에 모두 동의해 주세요.'
    );
  end if;

  select id into v_plan_id
  from public.subscription_plans
  where code = 'starter' and is_active = true
  limit 1;

  insert into public.centers (
    name,
    slug,
    status,
    plan_id,
    contact_email,
    contact_phone,
    service_starts_at,
    service_ends_at,
    logo_url,
    settings
  )
  values (
    trim(p_name),
    v_slug,
    'active',
    v_plan_id,
    nullif(trim(coalesce(p_contact_email, '')), ''),
    v_phone_digits,
    v_today,
    v_today + 14,
    null,
    jsonb_build_object('theme', v_default_theme, 'beta_trial', true)
  )
  returning id into v_center_id;

  insert into public.center_features (center_id, feature_key, enabled)
  select v_center_id, f.key, coalesce((sp.features ->> f.key)::boolean, false)
  from public.subscription_plans sp
  cross join (
    values ('mileage'), ('contracts'), ('notifications')
  ) as f(key)
  where sp.id = v_plan_id
  on conflict (center_id, feature_key) do nothing;

  insert into public.center_users (
    center_id,
    role,
    username,
    password_hash,
    display_name,
    phone
  )
  values (
    v_center_id,
    'center_admin',
    v_username,
    extensions.crypt(p_admin_password, extensions.gen_salt('bf')),
    trim(p_name) || ' 관리자',
    v_phone_digits
  )
  returning id into v_admin_id;

  insert into public.signup_consent_records (
    subject_type,
    center_id,
    center_user_id,
    name,
    phone,
    email,
    agree_age,
    agree_terms,
    agree_privacy,
    agree_marketing
  )
  values (
    'center_admin',
    v_center_id,
    v_admin_id,
    trim(p_name),
    v_phone_digits,
    nullif(trim(coalesce(p_contact_email, '')), ''),
    coalesce(p_agree_age, false),
    coalesce(p_agree_terms, false),
    coalesce(p_agree_privacy, false),
    coalesce(p_agree_marketing, false)
  );

  return json_build_object(
    'ok', true,
    'center_id', v_center_id,
    'center_slug', v_slug,
    'center_name', trim(p_name),
    'admin_user_id', v_admin_id,
    'admin_username', v_username,
    'status', 'active',
    'service_starts_at', v_today,
    'service_ends_at', v_today + 14
  );
exception
  when unique_violation then
    return json_build_object('ok', false, 'error', 'slug_taken');
end;
$$;

-- ---------------------------------------------------------------------------
-- 회원 가입: 동의 저장
-- ---------------------------------------------------------------------------
create or replace function public.register_member(
  p_name text,
  p_phone text,
  p_password text,
  p_device_type text default 'unknown',
  p_center_slug text default null,
  p_agree_age boolean default false,
  p_agree_terms boolean default false,
  p_agree_privacy boolean default false,
  p_agree_marketing boolean default false
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_member public.members%rowtype;
  v_center public.centers%rowtype;
  v_digits text;
  v_token text;
  v_slug text := nullif(lower(trim(coalesce(p_center_slug, ''))), '');
  v_access json;
begin
  if v_slug is null then
    return json_build_object(
      'ok', false,
      'error', 'center_required',
      'message', '센터에서 안내한 회원 페이지 링크로 접속해 주세요.'
    );
  end if;

  select * into v_center
  from public.centers
  where slug = v_slug
    and deleted_at is null;

  if not found then
    return json_build_object('ok', false, 'error', 'center_not_configured');
  end if;

  v_access := public.check_center_service_access(v_center);
  if coalesce((v_access ->> 'ok')::boolean, false) is not true then
    return v_access;
  end if;

  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  if trim(coalesce(p_name, '')) = '' then
    return json_build_object('ok', false, 'error', 'invalid_name');
  end if;

  if length(v_digits) <> 11 or left(v_digits, 3) <> '010' then
    return json_build_object('ok', false, 'error', 'invalid_phone');
  end if;

  if p_password is null or length(p_password) < 4 then
    return json_build_object('ok', false, 'error', 'invalid_password');
  end if;

  if coalesce(p_agree_age, false) is not true
     or coalesce(p_agree_terms, false) is not true
     or coalesce(p_agree_privacy, false) is not true then
    return json_build_object(
      'ok', false,
      'error', 'consent_required',
      'message', '필수 약관에 모두 동의해 주세요.'
    );
  end if;

  if exists (
    select 1 from public.members m
    where m.center_id = v_center.id
      and regexp_replace(m.phone, '\D', '', 'g') = v_digits
  ) then
    return json_build_object('ok', false, 'error', 'already_exists');
  end if;

  insert into public.members (
    center_id,
    name,
    phone,
    total_sessions,
    remaining_sessions,
    payment_amount,
    registered_at,
    expires_at,
    status
  )
  values (
    v_center.id,
    trim(p_name),
    v_digits,
    0,
    0,
    0,
    current_date,
    null,
    'active'
  )
  returning * into v_member;

  insert into public.member_credentials (member_id, center_id, password_hash)
  values (
    v_member.id,
    v_center.id,
    extensions.crypt(p_password, extensions.gen_salt('bf'))
  )
  on conflict (member_id) do update
  set
    center_id = excluded.center_id,
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
    updated_at = now();

  insert into public.signup_consent_records (
    subject_type,
    center_id,
    member_id,
    name,
    phone,
    agree_age,
    agree_terms,
    agree_privacy,
    agree_marketing
  )
  values (
    'member',
    v_center.id,
    v_member.id,
    trim(p_name),
    v_digits,
    coalesce(p_agree_age, false),
    coalesce(p_agree_terms, false),
    coalesce(p_agree_privacy, false),
    coalesce(p_agree_marketing, false)
  );

  v_token := public.create_auth_session(
    'member',
    v_member.id,
    v_center.id,
    'member'
  );

  perform public.insert_member_login_log(v_member.id, p_device_type);

  return json_build_object(
    'ok', true,
    'id', v_member.id,
    'name', v_member.name,
    'phone', v_member.phone,
    'token', v_token,
    'center_id', v_center.id,
    'center_slug', v_slug,
    'center_name', v_center.name
  );
exception
  when unique_violation then
    return json_build_object('ok', false, 'error', 'already_exists');
end;
$$;

-- ---------------------------------------------------------------------------
-- 플랫폼: 센터 계정 목록
-- ---------------------------------------------------------------------------
create or replace function public.list_center_users_for_platform(
  p_session_token text,
  p_center_id uuid
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

  if not exists (
    select 1 from public.centers c
    where c.id = p_center_id and c.deleted_at is null
  ) then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  return json_build_object(
    'ok', true,
    'users', coalesce(
      (
        select json_agg(
          json_build_object(
            'id', cu.id,
            'username', cu.username,
            'role', cu.role::text,
            'display_name', cu.display_name,
            'phone', cu.phone,
            'status', cu.status,
            'trainer_id', cu.trainer_id,
            'trainer_name', t.name,
            'last_login_at', cu.last_login_at,
            'created_at', cu.created_at
          )
          order by cu.role, cu.username
        )
        from public.center_users cu
        left join public.trainers t on t.id = cu.trainer_id
        where cu.center_id = p_center_id
      ),
      '[]'::json
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 플랫폼: 관리자 비밀번호 → 휴대폰 뒤 4자리로 초기화
-- ---------------------------------------------------------------------------
create or replace function public.reset_center_user_password_platform(
  p_session_token text,
  p_center_user_id uuid
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.center_users%rowtype;
  v_center public.centers%rowtype;
  v_phone_digits text;
  v_new_password text;
begin
  if not exists (
    select 1
    from public.verify_auth_session(p_session_token, 'platform_admin', 'super_admin')
  ) then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select cu.* into v_user
  from public.center_users cu
  where cu.id = p_center_user_id;

  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_center
  from public.centers
  where id = v_user.center_id
    and deleted_at is null;

  if not found then
    return json_build_object('ok', false, 'error', 'center_not_found');
  end if;

  v_phone_digits := regexp_replace(
    coalesce(v_user.phone, v_center.contact_phone, ''),
    '\D',
    '',
    'g'
  );

  if length(v_phone_digits) < 4 then
    return json_build_object(
      'ok', false,
      'error', 'no_phone',
      'message', '등록된 휴대전화번호가 없어 초기화할 수 없습니다.'
    );
  end if;

  v_new_password := right(v_phone_digits, 4);

  update public.center_users
  set
    password_hash = extensions.crypt(v_new_password, extensions.gen_salt('bf')),
    updated_at = now()
  where id = v_user.id;

  return json_build_object(
    'ok', true,
    'username', v_user.username,
    'temp_password', v_new_password
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 플랫폼: 가입 동의 기록 (엑셀 다운로드용)
-- ---------------------------------------------------------------------------
create or replace function public.list_signup_consents_for_platform(
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
    'records', coalesce(
      (
        select json_agg(
          json_build_object(
            'id', r.id,
            'subject_type', r.subject_type,
            'center_id', r.center_id,
            'center_name', c.name,
            'center_slug', c.slug,
            'member_id', r.member_id,
            'center_user_id', r.center_user_id,
            'name', r.name,
            'phone', r.phone,
            'email', r.email,
            'agree_age', r.agree_age,
            'agree_terms', r.agree_terms,
            'agree_privacy', r.agree_privacy,
            'agree_marketing', r.agree_marketing,
            'created_at', r.created_at
          )
          order by r.created_at desc
        )
        from public.signup_consent_records r
        left join public.centers c on c.id = r.center_id
      ),
      '[]'::json
    )
  );
end;
$$;

revoke all on function public.self_register_center(text, text, text, text, text, text) from public;
grant execute on function public.self_register_center(
  text, text, text, text, text, text, boolean, boolean, boolean, boolean
) to anon, authenticated;

revoke all on function public.register_member(text, text, text, text, text) from public;
grant execute on function public.register_member(
  text, text, text, text, text, boolean, boolean, boolean, boolean
) to anon, authenticated;

revoke all on function public.list_center_users_for_platform(text, uuid) from public;
grant execute on function public.list_center_users_for_platform(text, uuid) to anon, authenticated;

revoke all on function public.reset_center_user_password_platform(text, uuid) from public;
grant execute on function public.reset_center_user_password_platform(text, uuid) to anon, authenticated;

revoke all on function public.list_signup_consents_for_platform(text) from public;
grant execute on function public.list_signup_consents_for_platform(text) to anon, authenticated;
