import { getAdminSession } from './adminSession'

/** Edge Function 알림 호출용 관리자 세션 헤더 */
export function adminSessionHeaders(): Record<string, string> {
  const token = getAdminSession()?.token
  if (!token) return {}
  return { 'x-session-token': token }
}

export function requireAdminSessionToken(): string {
  const token = getAdminSession()?.token
  if (!token) {
    throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.')
  }
  return token
}
