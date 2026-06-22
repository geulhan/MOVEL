import { MOTIONHUB_BRAND_KO } from './motionhubSeo'

/** MotionHub 플랫폼 랜딩 — 외부 링크·설정 */

/**
 * MotionHub 공식 카카오톡 채널 URL (MOVEL 채널 대체).
 * 운영 시 VITE_MOTIONHUB_KAKAO_URL 로 MotionHub 비즈니스 채널 URL을 설정하세요.
 */
export function getMotionHubKakaoUrl(): string {
  const fromEnv = import.meta.env.VITE_MOTIONHUB_KAKAO_URL as string | undefined
  if (fromEnv?.trim()) return fromEnv.trim()
  return 'http://pf.kakao.com/_rDSXX'
}

export const MOTIONHUB_CONTACT = {
  kakaoLabel: `${MOTIONHUB_BRAND_KO} 카카오톡 채널`,
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
