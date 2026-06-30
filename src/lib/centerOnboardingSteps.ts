import type { CenterOnboardingProgress } from '../api/centerOnboarding'

export type CenterOnboardingStepId =
  | 'signup'
  | 'settings'
  | 'first_member'
  | 'alimtalk'
  | 'member_portal'
  | 'schedule'
  | 'first_session'

export type CenterOnboardingStep = {
  id: CenterOnboardingStepId
  title: string
  description: string
  done: boolean
  actionLabel: string
  actionTo: string
  optional?: boolean
}

export function buildCenterOnboardingSteps(
  progress: CenterOnboardingProgress,
): CenterOnboardingStep[] {
  const hasSettings =
    progress.settingsVisited || progress.trainerCount > 0 || progress.memberCount > 0

  return [
    {
      id: 'signup',
      title: '센터 가입',
      description: 'MotionHub 센터 계정이 생성되었습니다.',
      done: true,
      actionLabel: '완료',
      actionTo: '/admin',
    },
    {
      id: 'settings',
      title: '센터 정보 확인',
      description: '센터명·연락처·회원 앱 주소를 확인합니다.',
      done: hasSettings,
      actionLabel: hasSettings ? '설정 보기' : '센터 정보 입력',
      actionTo: '/admin/settings',
    },
    {
      id: 'first_member',
      title: '회원 1명 등록',
      description: '이름과 휴대폰만 입력하면 됩니다. 1분이면 충분합니다.',
      done: progress.memberCount >= 1,
      actionLabel: progress.memberCount >= 1 ? '회원 보기' : '회원 등록하기',
      actionTo: '/admin/members?onboarding=register',
    },
    {
      id: 'alimtalk',
      title: '회원 가입 안내 발송',
      description: '회원 등록과 동시에 카카오 알림톡이 자동 발송됩니다.',
      done: progress.memberCount >= 1,
      actionLabel: progress.memberCount >= 1 ? '발송 완료' : '회원 등록 후 자동 발송',
      actionTo: '/admin/members?onboarding=register',
    },
    {
      id: 'member_portal',
      title: '회원 앱 체험',
      description:
        '회원이 motionhub.kr/member 에서 휴대폰 + 뒤 4자리로 로그인해 예약·운동일지를 확인합니다.',
      done:
        progress.memberLoginCount > 0 || progress.memberPortalShared,
      actionLabel: '회원 앱 링크 복사',
      actionTo: '/admin/members?onboarding=portal',
    },
    {
      id: 'schedule',
      title: '첫 PT 예약',
      description: '회원에게 보여줄 다음 수업 일정을 등록합니다.',
      done: progress.scheduleCount >= 1,
      actionLabel: progress.scheduleCount >= 1 ? '일정 보기' : '예약 등록하기',
      actionTo: '/admin/schedule',
    },
    {
      id: 'first_session',
      title: '첫 운동 기록',
      description: '출석·운동일지를 남기면 회원 앱에 바로 반영됩니다.',
      done: progress.sessionLogCount >= 1,
      actionLabel: progress.sessionLogCount >= 1 ? '기록 보기' : '출석·기록하기',
      actionTo: '/admin/attendance',
    },
  ]
}

export function onboardingCompletionPercent(steps: CenterOnboardingStep[]): number {
  if (steps.length === 0) return 0
  const done = steps.filter((step) => step.done).length
  return Math.round((done / steps.length) * 100)
}

export function nextOnboardingStep(
  steps: CenterOnboardingStep[],
): CenterOnboardingStep | null {
  return steps.find((step) => !step.done && step.id !== 'signup') ?? null
}

export function isOnboardingComplete(steps: CenterOnboardingStep[]): boolean {
  return steps.every((step) => step.done || step.id === 'signup')
}
