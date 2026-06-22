import { MOTIONHUB_SITE_URL } from './motionhubSeo'

/** 센터 가입 축하 알림톡 #{guideUrl} — 신규 센터 시작 가이드 */
export const MOTIONHUB_CENTER_GUIDE_PATH = '/guide' as const

export const MOTIONHUB_CENTER_GUIDE_URL = `${MOTIONHUB_SITE_URL}${MOTIONHUB_CENTER_GUIDE_PATH}`

/** 회원가입 안내 알림톡 고정 URL (변수 없음, 템플릿 본문 고정) */
export const MOTIONHUB_MEMBER_SIGNUP_PORTAL_URL = `${MOTIONHUB_SITE_URL}/member`

/** 회원 포털 URL (회원용 알림톡 안내) */
export function getMemberPortalUrl(centerSlug?: string): string {
  const slug = centerSlug?.trim().toLowerCase() ?? ''
  return slug
    ? `${MOTIONHUB_SITE_URL}/member?center=${encodeURIComponent(slug)}`
    : MOTIONHUB_MEMBER_SIGNUP_PORTAL_URL
}
