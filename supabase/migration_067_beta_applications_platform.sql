-- 플랫폼 슈퍼관리자: 베타 신청 목록 조회

create or replace function public.list_beta_applications_for_platform(
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
    'applications', coalesce(
      (
        select json_agg(
          json_build_object(
            'id', b.id,
            'center_name', b.center_name,
            'contact_name', b.contact_name,
            'phone', b.phone,
            'email', b.email,
            'center_type', b.center_type,
            'message', b.message,
            'created_at', b.created_at
          )
          order by b.created_at desc
        )
        from public.beta_applications b
      ),
      '[]'::json
    )
  );
end;
$$;

revoke all on function public.list_beta_applications_for_platform(text) from public;
grant execute on function public.list_beta_applications_for_platform(text) to anon, authenticated;
