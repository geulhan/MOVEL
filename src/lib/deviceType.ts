/** 회원 로그인 기기/브라우저 분류 */
export function detectDeviceType(): string {
  if (typeof navigator === 'undefined') return 'unknown'

  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('kakaotalk')) return 'kakaotalk'
  if (ua.includes('instagram')) return 'instagram'
  if (ua.includes('fbav') || ua.includes('fban')) return 'facebook'
  if (ua.includes('line/')) return 'line'
  if (/iphone|ipad|ipod|android|mobile/.test(ua)) return 'mobile'
  return 'desktop'
}
