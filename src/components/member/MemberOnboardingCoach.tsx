import {
  getMemberFlowStep,
  memberFlowPercent,
  MEMBER_IN_APP_FLOW_STEPS,
  type MemberFlowStepId,
} from '../../lib/memberOnboardingFlow'
import {
  advanceMemberFlow,
  completeMemberFlow,
  dismissMemberFlow,
  getMemberFlowState,
  isMemberFlowActive,
} from '../../lib/memberOnboardingStorage'
import { btnGold, btnOutline } from '../../styles/theme'

type PortalTab =
  | 'home'
  | 'schedule'
  | 'journal'
  | 'rewards'
  | 'payment'
  | 'inbody'
  | 'growth'
  | 'mypage'

type Props = {
  memberId: string
  memberName: string
  activeTab: PortalTab
  onNavigate: (tab: PortalTab) => void
  onFlowChange?: () => void
}

function tabForStep(stepId: MemberFlowStepId): PortalTab {
  if (stepId === 'home') return 'home'
  return stepId
}

function isOnStepTab(stepId: MemberFlowStepId, activeTab: PortalTab): boolean {
  if (stepId === 'home') return activeTab === 'home'
  return activeTab === stepId
}

export function MemberOnboardingCoach({
  memberId,
  memberName,
  activeTab,
  onNavigate,
  onFlowChange,
}: Props) {
  if (!isMemberFlowActive(memberId)) return null

  const state = getMemberFlowState(memberId)
  const step = getMemberFlowStep(state.stepIndex)
  if (!step) return null
  const currentStep = step

  const percent = memberFlowPercent(state.stepIndex, state.complete)
  const stepNumber = state.stepIndex + 1
  const onCorrectTab = isOnStepTab(currentStep.id, activeTab)

  function refresh() {
    onFlowChange?.()
  }

  function handlePrimary() {
    if (currentStep.id === 'rewards') {
      completeMemberFlow(memberId)
      refresh()
      return
    }
    const next = advanceMemberFlow(memberId)
    const nextStep = getMemberFlowStep(next.stepIndex)
    if (nextStep) {
      onNavigate(tabForStep(nextStep.id))
    }
    refresh()
  }

  function handleGoToStep() {
    onNavigate(tabForStep(currentStep.id))
  }

  if (!onCorrectTab) {
    return (
      <div className="rounded-2xl border border-gold/40 bg-gradient-to-r from-cream/90 to-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gold-dark">
              시작하기 {stepNumber}/{MEMBER_IN_APP_FLOW_STEPS.length}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-charcoal">
              다음: {currentStep.title}
            </p>
          </div>
          <button type="button" onClick={handleGoToStep} className={btnGold}>
            이동하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
            시작하기 {stepNumber}/{MEMBER_IN_APP_FLOW_STEPS.length} · {percent}%
          </p>
          <h2 className="mt-1 text-base font-bold text-charcoal">
            {state.stepIndex === 0
              ? `${memberName} 님, 환영합니다!`
              : currentStep.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => {
            dismissMemberFlow(memberId)
            refresh()
          }}
          className="shrink-0 text-xs text-muted underline-offset-2 hover:underline"
        >
          건너뛰기
        </button>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-charcoal/8">
        <div
          className="h-full rounded-full bg-sky-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="text-sm leading-relaxed text-charcoal/75">{currentStep.description}</p>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handlePrimary} className={btnGold}>
          {currentStep.actionLabel}
        </button>
        {currentStep.id !== 'home' && (
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={btnOutline}
          >
            홈으로
          </button>
        )}
      </div>
    </div>
  )
}

export function MemberOnboardingCompleteBanner({
  memberName,
  onDismiss,
}: {
  memberName: string
  onDismiss: () => void
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center">
      <p className="text-2xl" aria-hidden>
        🎉
      </p>
      <h2 className="mt-2 text-lg font-bold text-charcoal">
        {memberName} 님, 준비 완료!
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-charcoal/75">
        예약 · 운동일지 · 리워드를 자유롭게 이용해 보세요.
        <br />
        궁금한 점은 센터에 문의해 주세요.
      </p>
      <button type="button" onClick={onDismiss} className={`mt-4 ${btnOutline}`}>
        닫기
      </button>
    </div>
  )
}
