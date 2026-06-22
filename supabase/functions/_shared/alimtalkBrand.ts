/** MotionHub 플랫폼 알림톡 브랜드 (Solapi 템플릿 본문에 고정 문구로 넣거나 #{brandHeader} 변수 사용) */
export const ALIMTALK_BRAND_HEADER = '[모션허브]'

/** 센터 가입 축하 알림톡 #{guideUrl} 경로 */
export const MOTIONHUB_CENTER_GUIDE_PATH = '/guide'

export const ALIMTALK_TEMPLATE_GUIDE = {
  brandHeader: ALIMTALK_BRAND_HEADER,
  greetingPattern: '#{centerName} 회원님',
  centerGuidePath: MOTIONHUB_CENTER_GUIDE_PATH,
  note: 'MOVEL 채널·「안녕하세요 MOVEL입니다」 문구는 사용하지 않습니다. MotionHub 카카오 채널 + 아래 공통 구조로 재등록하세요.',
} as const
