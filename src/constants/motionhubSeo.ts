/** MotionHub 랜딩 SEO · Open Graph (정적 HTML·클라이언트 공통) */

export const MOTIONHUB_SITE_URL = 'https://motionhub.kr'

export const MOTIONHUB_SEO = {
  title: 'MotionHub | 운동센터 운영 플랫폼',
  description:
    '회원관리, 운동일지, 출석관리, 마일리지, 알림톡, 재등록 관리를 하나로 연결하는 운동센터 운영 플랫폼',
  applicationName: 'MotionHub',
  ogType: 'website',
  ogImagePath: '/motionhub-og.png',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterCard: 'summary_large_image',
  locale: 'ko_KR',
} as const

export function getMotionHubOgImageUrl(): string {
  return `${MOTIONHUB_SITE_URL}${MOTIONHUB_SEO.ogImagePath}`
}
