export type MemberFlowStepId = 'home' | 'schedule' | 'journal' | 'rewards'

export type MemberFlowStep = {
  id: MemberFlowStepId
  title: string
  description: string
  tab: MemberFlowStepId | null
  actionLabel: string
}

/** 알림톡 이후 앱 내 4단계 (로그인 직후 ~ 리워드) */
export const MEMBER_IN_APP_FLOW_STEPS: MemberFlowStep[] = [
  {
    id: 'home',
    title: '회원 홈 둘러보기',
    description:
      '잔여 PT 횟수, 담당 트레이너, 만료일을 한곳에서 확인할 수 있습니다.',
    tab: null,
    actionLabel: '다음: 예약 확인',
  },
  {
    id: 'schedule',
    title: '첫 예약 확인',
    description:
      '다음 PT·그룹수업 일정이 여기에 표시됩니다. 센터에서 등록하면 바로 보입니다.',
    tab: 'schedule',
    actionLabel: '다음: 운동일지',
  },
  {
    id: 'journal',
    title: '운동일지 보기',
    description: '트레이너가 남긴 운동 기록을 언제든 확인할 수 있습니다.',
    tab: 'journal',
    actionLabel: '다음: 리워드',
  },
  {
    id: 'rewards',
    title: '리워드 확인',
    description: '만보 인증 등 활동 리워드를 받고 센터 혜택을 누려 보세요.',
    tab: 'rewards',
    actionLabel: '시작하기 완료',
  },
]

/** 알림톡 링크(welcome)에서 보여줄 전체 여정 */
export const MEMBER_WELCOME_JOURNEY = [
  { label: '회원가입 안내 알림톡 발송', doneOnWelcome: true },
  { label: 'motionhub.kr/member 접속', doneOnWelcome: true },
  { label: '첫 로그인', doneOnWelcome: false },
  { label: '회원 홈 튜토리얼', doneOnWelcome: false },
  { label: '첫 예약 확인', doneOnWelcome: false },
  { label: '첫 운동일지 보기', doneOnWelcome: false },
  { label: '리워드 확인', doneOnWelcome: false },
] as const

export function memberFlowPercent(stepIndex: number, complete: boolean): number {
  if (complete) return 100
  const total = MEMBER_IN_APP_FLOW_STEPS.length
  return Math.round((stepIndex / total) * 100)
}

export function getMemberFlowStep(stepIndex: number): MemberFlowStep | null {
  return MEMBER_IN_APP_FLOW_STEPS[stepIndex] ?? null
}
