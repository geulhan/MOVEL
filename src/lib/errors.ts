export function formatSupabaseError(err: unknown): string {
  if (!err || typeof err !== 'object') return '알 수 없는 오류가 발생했습니다.'

  const e = err as { message?: string; code?: string; hint?: string }
  const msg = e.message ?? ''

  if (
    msg.includes('verify_member_login') ||
    msg.includes('change_member_password') ||
    msg.includes('member_credentials') ||
    msg.includes('verify_admin_login') ||
    msg.includes('admin_users')
  ) {
    return (
      '데이터베이스 로그인 설정이 필요합니다. ' +
      'Supabase SQL Editor에서 supabase/migration_014_member_auth.sql (회원) 또는 migration_012_admin_users.sql (관리자)을 실행해 주세요.'
    )
  }

  if (
    msg.includes('trainers') ||
    msg.includes('trainer_id') ||
    msg.includes('period_extensions') ||
    e.code === '42P01'
  ) {
    return (
      '데이터베이스 설정이 완료되지 않았습니다. ' +
      'Supabase SQL Editor에서 supabase/fix_all.sql 파일을 실행해 주세요.'
    )
  }

  if (e.code === '42501') {
    return 'DB 접근 권한이 없습니다. fix_all.sql의 RLS 정책을 실행해 주세요.'
  }

  return msg || '요청 처리 중 오류가 발생했습니다.'
}
