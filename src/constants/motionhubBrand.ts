/** 사용자 제공 모션허브 브랜드 에셋 (KakaoTalk 원본 이미지) */
export const MOTIONHUB_BRAND = {
  primary: '#26E6C8',
  primaryDark: '#1ECFB4',
  primaryLight: '#E8FBF7',
  deep: '#0B0E11',
  /** 헤더 등 어두운 배경 — 로고 PNG 자체가 투명 */
  logoHeaderBg: 'transparent',
  charcoal: '#1C1C1C',
  surface: '#FFFFFF',
  textOnDark: '#FFFFFF',
  muted: '#757575',
  tagline: '회원이 운동을 지속하게 만드는 플랫폼',
} as const

/** public/brand/motionhub — 사용자 제공 에셋 */
export const MOTIONHUB_BRAND_ASSETS = {
  /** 밝은 배경 · 한글 가로 조합 */
  logoKoLight: '/brand/motionhub/logo-ko-light.png',
  /** 밝은 배경 · 영문 가로 조합 */
  logoEnLight: '/brand/motionhub/logo-en-light.png',
  /** 밝은 배경 · 영문 세로 조합 */
  logoVerticalLight: '/brand/motionhub/logo-vertical-light.png',
  /** 어두운 배경 · 투명 PNG 세로 조합 (아이콘+MotionHub) */
  logoTransparent: '/brand/motionhub/logo-transparent.png',
  /** 회원 포털 헤더 · 세로 조합 (아이콘 + MotionHub) */
  logoMemberVertical: '/brand/motionhub/logo-member-vertical.png',
  /** @deprecated logo-transparent.png 우선 사용 */
  logoDark: '/brand/motionhub/logo-transparent.png',
  /** 시안 배경 앱 아이콘 */
  iconCyan: '/brand/motionhub/icon-cyan.png',
  /** 다크 배경 앱 아이콘 */
  iconDark: '/brand/motionhub/icon-dark.png',
} as const
