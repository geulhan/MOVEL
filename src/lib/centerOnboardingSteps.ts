import type { CenterOnboardingProgress } from '../api/centerOnboarding'

export type GettingStartedStepId =
  | 'center_info'
  | 'first_member'
  | 'first_schedule'
  | 'first_attendance'
  | 'first_journal'
  | 'alimtalk_sent'
  | 'ai_report'

export type GettingStartedStep = {
  id: GettingStartedStepId
  title: string
  description: string
  done: boolean
  actionLabel: string
  actionTo: string
}

export function buildGettingStartedSteps(
  progress: CenterOnboardingProgress,
): GettingStartedStep[] {
  const attendanceDone =
    progress.attendanceLogCount >= 1 || progress.completedScheduleCount >= 1

  return [
    {
      id: 'center_info',
      title: '센터 정보 입력',
      description: '센터명·로고·회원 앱 주소를 설정합니다.',
      done: progress.centerInfoComplete,
      actionLabel: progress.centerInfoComplete ? '설정 보기' : '센터 정보 입력',
      actionTo: '/admin/settings',
    },
    {
      id: 'first_member',
      title: '회원 1명 등록',
      description: '이름과 휴대폰만 입력하면 됩니다.',
      done: progress.memberCount >= 1,
      actionLabel: progress.memberCount >= 1 ? '회원 보기' : '회원 등록하기',
      actionTo: '/admin/members/register?onboarding=register',
    },
    {
      id: 'first_schedule',
      title: '첫 예약 생성',
      description: 'PT 일정을 등록하면 회원 앱에 표시됩니다.',
      done: progress.scheduleCount >= 1,
      actionLabel: progress.scheduleCount >= 1 ? '일정 보기' : '예약 등록하기',
      actionTo: '/admin/schedule',
    },
    {
      id: 'first_attendance',
      title: '첫 출석 체크',
      description: '출석 처리 또는 수업 완료로 첫 출석을 기록합니다.',
      done: attendanceDone,
      actionLabel: attendanceDone ? '출석 보기' : '출석 체크하기',
      actionTo: '/admin/attendance',
    },
    {
      id: 'first_journal',
      title: '운동일지 작성',
      description: '회원 운동 기록을 남기면 앱에서 확인할 수 있습니다.',
      done: progress.journalCount >= 1,
      actionLabel: progress.journalCount >= 1 ? '일지 보기' : '운동일지 작성',
      actionTo: progress.firstMemberId
        ? `/admin/member/${progress.firstMemberId}/journal`
        : '/admin/members/register?onboarding=register',
    },
    {
      id: 'alimtalk_sent',
      title: '알림톡 발송 확인',
      description: '회원 가입 안내 알림톡이 발송되었는지 확인합니다.',
      done: progress.alimtalkSentCount >= 1,
      actionLabel:
        progress.alimtalkSentCount >= 1 ? '발송 내역 보기' : '회원 등록하기',
      actionTo:
        progress.alimtalkSentCount >= 1 ? '/admin/messages' : '/admin/members',
    },
    {
      id: 'ai_report',
      title: 'AI 리포트 확인',
      description: '이번 달 경영 상태와 다음 달 할 일을 확인합니다.',
      done: progress.aiReportGenerated,
      actionLabel: progress.aiReportGenerated ? '리포트 다시 보기' : 'AI 리포트 보기',
      actionTo: '/admin/analytics',
    },
  ]
}

export function gettingStartedPercent(steps: GettingStartedStep[]): number {
  if (steps.length === 0) return 0
  const done = steps.filter((step) => step.done).length
  return Math.round((done / steps.length) * 100)
}

export function nextGettingStartedStep(
  steps: GettingStartedStep[],
): GettingStartedStep | null {
  return steps.find((step) => !step.done) ?? null
}

export function isGettingStartedComplete(steps: GettingStartedStep[]): boolean {
  return steps.length > 0 && steps.every((step) => step.done)
}

/** @deprecated GettingStartedStep 사용 */
export type CenterOnboardingStep = GettingStartedStep
/** @deprecated buildGettingStartedSteps 사용 */
export const buildCenterOnboardingSteps = buildGettingStartedSteps
/** @deprecated gettingStartedPercent 사용 */
export const onboardingCompletionPercent = gettingStartedPercent
/** @deprecated nextGettingStartedStep 사용 */
export const nextOnboardingStep = nextGettingStartedStep
/** @deprecated isGettingStartedComplete 사용 */
export const isOnboardingComplete = isGettingStartedComplete
