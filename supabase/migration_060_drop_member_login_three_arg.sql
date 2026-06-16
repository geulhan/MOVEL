-- PostgREST RPC 오버로드 충돌 방지: 구버전 3-인자 회원 로그인 함수 제거
-- migration_052_member_auth_global.sql (4-인자) 적용 후 실행
--
-- 증상: Could not choose the best candidate function between
--   verify_member_login(text, text, text)
--   verify_member_login(text, text, text, text)

drop function if exists public.verify_member_login(text, text, text);
