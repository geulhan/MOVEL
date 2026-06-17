/** MotionHub 랜딩 SEO · Open Graph · 브랜드 노출명 (정적 HTML·클라이언트 공통) */

export const MOTIONHUB_SITE_URL = 'https://motionhub.kr'

/** 한국 시장 대외 노출명 */
export const MOTIONHUB_BRAND_KO = '모션허브'

/** 영문 브랜드명 (기술·국제 표기) */
export const MOTIONHUB_BRAND_EN = 'MotionHub'

/** UI 병기 표기 */
export const MOTIONHUB_BRAND_DISPLAY = `${MOTIONHUB_BRAND_KO} (${MOTIONHUB_BRAND_EN})`

export const MOTIONHUB_MAIN_MESSAGE =
  '회원이 운동을 지속하게 만드는 운동센터 운영 플랫폼'

export const MOTIONHUB_SUB_MESSAGE_LINES = [
  '회원관리',
  '재등록 관리',
  '운동일지',
  '출석관리',
  '마일리지',
  '알림톡',
] as const

export const MOTIONHUB_SEO = {
  title: '모션허브 | 운동센터 운영 플랫폼',
  description:
    '모션허브(MotionHub)는 회원이 운동을 지속하게 만드는 운동센터 운영 플랫폼입니다. PT샵·필라테스 센터의 회원관리, 재등록 관리, 운동일지, 출석관리, 마일리지, 알림톡을 하나로 연결합니다.',
  ogTitle: '모션허브 | 운동센터 운영 플랫폼',
  ogDescription:
    '모션허브(MotionHub) — 회원이 운동을 지속하게 만드는 운동센터 운영 플랫폼. 회원관리부터 재등록 관리까지 한 번에.',
  siteName: MOTIONHUB_BRAND_KO,
  applicationName: MOTIONHUB_BRAND_KO,
  ogType: 'website',
  ogImagePath: '/motionhub-og.png',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: `${MOTIONHUB_BRAND_KO} — ${MOTIONHUB_MAIN_MESSAGE}`,
  twitterCard: 'summary_large_image',
  locale: 'ko_KR',
} as const

export function getMotionHubOgImageUrl(): string {
  return `${MOTIONHUB_SITE_URL}${MOTIONHUB_SEO.ogImagePath}`
}
