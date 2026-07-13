export const LANDING_HERO = {
  title: '운동센터를 운영하는 방식이 바뀝니다.',
  subCopy: [
    '회원관리부터',
    '예약',
    '출석',
    '결제',
    '알림톡',
    'AI 운영비서까지',
    '운동센터 운영을 하나의 플랫폼으로.',
  ],
  ctaNote: '무료 세팅 받고 14일 사용해보기',
  ctaLabel: '무료 세팅 시작하기',
  feedCaption: '오늘 해야 할 일을 모션 허브가 먼저 알려드립니다.',
} as const

export const WHY_PAIN_STEPS = [
  '아직도 회원관리 때문에 퇴근이 늦으신가요?',
  '회원권 만료',
  '재등록',
  '예약 변경',
  '출석',
  '결제',
  '카카오톡',
  '엑셀',
  '메모',
] as const

export const AUTOMATION_FLOW = [
  { step: '회원 등록', result: '환영 알림톡' },
  { step: '예약 안내', result: '출석 체크' },
  { step: '재등록 안내', result: 'AI 분석' },
  { step: '오늘 해야 할 일', result: '자동 생성' },
] as const

export const LEGACY_DAY_TOOLS = [
  '카카오톡',
  '엑셀',
  '전화',
  '예약',
  '출석',
  '회원권',
  '메모',
] as const

export const TODAY_FEED_TASKS = [
  '재등록 알림톡 보내기',
  '오늘 PT 출석 처리',
  '상담 리드 팔로업',
  '후기 요청',
] as const

export const AUTO_EXAMPLES = [
  '회원가입 안내',
  '예약 리마인더',
  '재등록 안내',
  '회원권 만료',
  '주간 리포트',
] as const

export const TRIAL_BULLETS = [
  '무료 세팅',
  '14일 무료 체험',
  '언제든 종료 가능',
  '마음에 들면 그때 구독하세요.',
] as const

export const FAQ_ITEMS = [
  {
    q: '회원 등록이 어렵나요?',
    a: '엑셀 업로드 또는 초기 세팅 지원으로 빠르게 시작할 수 있습니다.',
  },
  {
    q: '회원도 가입해야 하나요?',
    a: '센터에서 회원을 등록한 뒤, 회원은 휴대폰 번호로 로그인만 하면 됩니다.',
  },
  {
    q: '카카오 알림톡도 가능한가요?',
    a: '가능합니다. 등록·결제·리마인더·재등록 안내를 자동 발송할 수 있습니다.',
  },
  {
    q: 'AI는 어떻게 동작하나요?',
    a: '센터 데이터를 분석하여 대표가 해야 할 일을 먼저 추천합니다.',
  },
] as const
