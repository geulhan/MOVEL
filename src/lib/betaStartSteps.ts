import type { CenterOnboardingProgress } from '../api/centerOnboarding'

export type BetaStartStepId =
  | 'first_member'
  | 'first_schedule'
  | 'first_attendance'
  | 'first_journal'
  | 'member_login'
  | 'ai_report'

export type BetaStartStep = {
  id: BetaStartStepId
  title: string
  description: string
  done: boolean
  actionLabel: string
  actionTo: string
  external?: boolean
}

export function buildBetaStartSteps(
  progress: CenterOnboardingProgress,
): BetaStartStep[] {
  const attendanceDone =
    progress.attendanceLogCount >= 1 || progress.completedScheduleCount >= 1

  return [
    {
      id: 'first_member',
      title: '회원 등록',
      description: '이름과 휴대폰만 입력하면 회원가입 안내 알림톡이 발송됩니다.',
      done: progress.memberCount >= 1,
      actionLabel: progress.memberCount >= 1 ? '회원 보기' : '회원 등록하기',
      actionTo: '/admin/members?onboarding=register',
    },
    {
      id: 'first_schedule',
      title: '예약 생성',
      description: 'PT 일정을 등록하면 회원 앱에 예약이 표시됩니다.',
      done: progress.scheduleCount >= 1,
      actionLabel: progress.scheduleCount >= 1 ? '일정 보기' : '예약 등록하기',
      actionTo: '/admin/schedule',
    },
    {
      id: 'first_attendance',
      title: '출석 체크',
      description: '출석 처리하면 출석 기록과 리워드가 자동 적립됩니다.',
      done: attendanceDone,
      actionLabel: attendanceDone ? '출석 보기' : '출석 체크하기',
      actionTo: '/admin/attendance',
    },
    {
      id: 'first_journal',
      title: '운동일지 작성',
      description: '운동 기록을 남기면 회원 앱에서 바로 확인할 수 있습니다.',
      done: progress.journalCount >= 1,
      actionLabel: progress.journalCount >= 1 ? '일지 보기' : '운동일지 작성',
      actionTo: progress.firstMemberId
        ? `/admin/member/${progress.firstMemberId}/journal`
        : '/admin/members?onboarding=register',
    },
    {
      id: 'member_login',
      title: '회원 로그인 확인',
      description: '회원이 앱에서 로그인했는지 확인합니다.',
      done: progress.memberLoginCount >= 1,
      actionLabel: '회원 앱 열기',
      actionTo: '/member',
      external: true,
    },
    {
      id: 'ai_report',
      title: 'AI 리포트 보기',
      description: '이번 달 경영 상태와 다음 달 할 일을 확인합니다.',
      done: progress.aiReportViewed,
      actionLabel: progress.aiReportViewed ? '리포트 다시 보기' : 'AI 리포트 보기',
      actionTo: '/admin/analytics',
    },
  ]
}

export function betaStartPercent(steps: BetaStartStep[]): number {
  if (steps.length === 0) return 0
  const done = steps.filter((step) => step.done).length
  return Math.round((done / steps.length) * 100)
}

export function nextBetaStartStep(steps: BetaStartStep[]): BetaStartStep | null {
  return steps.find((step) => !step.done) ?? null
}

export function isBetaStartComplete(steps: BetaStartStep[]): boolean {
  return steps.length > 0 && steps.every((step) => step.done)
}
