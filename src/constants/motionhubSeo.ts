/** MotionHub 랜딩 SEO · Open Graph · 브랜드 노출명 (정적 HTML·클라이언트 공통) */

export const MOTIONHUB_SITE_URL = 'https://motionhub.kr'

/** 한국 시장 대외 노출명 */
export const MOTIONHUB_BRAND_KO = '모션허브'

/** 영문 브랜드명 (기술·국제 표기) */
export const MOTIONHUB_BRAND_EN = 'MotionHub'

/** UI 병기 표기 */
export const MOTIONHUB_BRAND_DISPLAY = `${MOTIONHUB_BRAND_KO} (${MOTIONHUB_BRAND_EN})`

export const MOTIONHUB_MAIN_MESSAGE =
  '운동센터를 운영하는 방식이 바뀝니다.'

export const MOTIONHUB_HERO_SUBLINE =
  '회원관리 · 예약 · 출석 · 결제 · 알림톡 · AI 운영비서까지 하나의 플랫폼으로.'

export const MOTIONHUB_TRUST_LINE =
  '모션허브는 현장 PT 센터 운영 경험을 바탕으로 만들어졌습니다.'

export const MOTIONHUB_SUB_MESSAGE_LINES = [
  '회원관리',
  '재등록 관리',
  '운동일지',
  '출석관리',
  '마일리지',
  '알림톡',
] as const

export const MOTIONHUB_SEO = {
  title: '모션허브 | 운동센터 AI 운영 플랫폼',
  description:
    '모션허브(MotionHub)는 회원관리·예약·출석·결제·알림톡·AI 운영비서를 하나로 연결하는 운동센터 AI Operating System입니다. 무료 세팅 후 14일 체험.',
  ogTitle: '모션허브 | 운동센터 AI 운영 플랫폼',
  ogDescription:
    '운영은 MotionHub에게 맡기고 회원에게 집중하세요. Today Feed로 오늘 할 일을 바로 처리합니다.',
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

/** 센터 시작 가이드 (/guide) SEO */
export const MOTIONHUB_GUIDE_SEO = {
  title: '모션허브 시작 가이드',
  description:
    '운동센터 운영을 위한 모션허브 초기 설정 및 이용 방법 안내',
  ogTitle: '모션허브 시작 가이드',
  ogDescription:
    '운동센터 운영을 위한 모션허브 초기 설정 및 이용 방법 안내',
  canonicalPath: '/guide',
} as const
