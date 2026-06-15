/** MotionHub 플랫폼 랜딩 — 외부 링크·설정 */

export const MOTIONHUB_CONTACT = {
  kakaoUrl: 'https://open.kakao.com/o/motionhub',
  instagramUrl: 'https://instagram.com/motionhub.kr',
  instagramHandle: '@motionhub.kr',
} as const

export const MOTIONHUB_TRUST_FEATURES = [
  '회원관리',
  '출석관리',
  '운동일지',
  '마일리지',
  '알림톡',
  '재등록 관리',
] as const

export function getMotionHubDemoUrl(): string {
  const fromEnv = import.meta.env.VITE_DEMO_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}/member`
  }
  return 'https://motionhub.kr/member'
}
