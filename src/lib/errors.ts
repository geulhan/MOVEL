const AUTH_MIGRATION_HINT =
  'Supabase SQL Editor에서 migration_043 → 050 → 051(관리자) / 052(회원) 순서로 실행해 주세요.'

function authRpcSetupMessage(kind: 'admin' | 'member', detail: string): string {
  const target = kind === 'admin' ? '관리자' : '회원'
  return `데이터베이스 ${target} 로그인 설정이 필요합니다. ${AUTH_MIGRATION_HINT} (상세: ${detail})`
}

function isAuthRpcSetupError(message: string): boolean {
  return (
    message.includes('verify_member_login') ||
    message.includes('change_member_password') ||
    message.includes('member_credentials') ||
    message.includes('verify_admin_login') ||
    message.includes('admin_users') ||
    message.includes('center_users') ||
    message.includes('Could not find the function') ||
    message.includes('PGRST202')
  )
}

export function formatSupabaseError(err: unknown): string {
  if (!err || typeof err !== 'object') return '알 수 없는 오류가 발생했습니다.'

  const e = err as { message?: string; code?: string; hint?: string }
  const msg = e.message ?? ''

  if (isAuthRpcSetupError(msg)) {
    const kind = msg.includes('verify_member_login') || msg.includes('member_credentials')
      ? 'member'
      : 'admin'
    return authRpcSetupMessage(kind, msg)
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

/** catch 블록에서 사용자에게 보여줄 메시지 (Supabase·Error·기타 객체 통합) */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  const formatted = formatSupabaseError(err)
  if (formatted !== '알 수 없는 오류가 발생했습니다.') return formatted
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message?: unknown }).message
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  return '요청 처리 중 오류가 발생했습니다.'
}
