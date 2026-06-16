-- PostgREST RPC 오버로드 충돌 방지: 구버전 2-인자 로그인 함수 제거
-- migration_043 / 051 / 052 적용 후 실행

drop function if exists public.verify_admin_login(text, text);

drop function if exists public.verify_member_login(text, text);
drop function if exists public.verify_member_login(text, text, text);
