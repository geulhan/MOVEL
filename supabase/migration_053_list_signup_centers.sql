-- 회원 가입 화면: 이용 가능한 센터 목록 (공개 RPC)

create or replace function public.list_signup_centers()
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return json_build_object(
    'ok', true,
    'centers', coalesce(
      (
        select json_agg(
          json_build_object(
            'id', c.id,
            'name', c.name,
            'slug', c.slug,
            'logo_url', c.logo_url
          )
          order by c.name asc
        )
        from public.centers c
        where c.deleted_at is null
          and c.status = 'active'
          and coalesce((public.check_center_service_access(c) ->> 'ok')::boolean, false)
      ),
      '[]'::json
    )
  );
end;
$$;

revoke all on function public.list_signup_centers() from public;
grant execute on function public.list_signup_centers() to anon, authenticated;
