/** MotionHub 랜딩 SEO · Open Graph · 브랜드 노출명 (정적 HTML·클라이언트 공통) */

export const MOTIONHUB_SITE_URL = 'https://motionhub.kr'

/** 한국 시장 대외 노출명 */
export const MOTIONHUB_BRAND_KO = '모션허브'

/** 영문 브랜드명 (기술·국제 표기) */
export const MOTIONHUB_BRAND_EN = 'MotionHub'

/** UI 병기 표기 */
export const MOTIONHUB_BRAND_DISPLAY = `${MOTIONHUB_BRAND_KO} (${MOTIONHUB_BRAND_EN})`

export const MOTIONHUB_SEO = {
  title: `${MOTIONHUB_BRAND_KO} | 운동센터 운영 플랫폼`,
  description:
    '회원관리, 운동일지, 출석관리, 마일리지, 알림톡, 재등록 관리를 하나로 연결하는 운동센터 운영 플랫폼',
  siteName: MOTIONHUB_BRAND_KO,
  applicationName: MOTIONHUB_BRAND_KO,
  ogType: 'website',
  ogImagePath: '/motionhub-og.png',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: `${MOTIONHUB_BRAND_KO} — 운동센터 운영을 하나의 허브로`,
  twitterCard: 'summary_large_image',
  locale: 'ko_KR',
} as const

export function getMotionHubOgImageUrl(): string {
  return `${MOTIONHUB_SITE_URL}${MOTIONHUB_SEO.ogImagePath}`
}
