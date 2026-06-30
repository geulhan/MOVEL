import { btnGold, btnOutline, cardClass } from '../../styles/theme'

type MemberPortalTab = 'schedule' | 'journal' | 'home'

type Props = {
  onSelectTab: (tab: MemberPortalTab) => void
  onDismiss: () => void
  phoneTail: string
}

const STEPS: Array<{
  id: MemberPortalTab | 'remaining'
  title: string
  description: string
  actionLabel: string
}> = [
  {
    id: 'schedule',
    title: '다음 예약 확인',
    description: 'PT·그룹수업 일정을 한눈에 봅니다.',
    actionLabel: '예약 보기',
  },
  {
    id: 'journal',
    title: '운동일지 미리보기',
    description: '트레이너가 남긴 기록을 확인합니다.',
    actionLabel: '운동일지',
  },
  {
    id: 'remaining',
    title: '잔여횟수 확인',
    description: '남은 PT 횟수와 만료일을 확인합니다.',
    actionLabel: '홈으로',
  },
]

export function MemberOnboardingGuide({ onSelectTab, onDismiss, phoneTail }: Props) {
  return (
    <section className={`${cardClass} space-y-4 border-sky-200 bg-sky-50/60 p-5`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
          시작 가이드
        </p>
        <h2 className="mt-1 text-lg font-bold text-charcoal">모션허브, 이렇게 쓰면 됩니다</h2>
        <p className="mt-1 text-sm text-charcoal/75">
          로그인 비밀번호는 휴대폰 <strong>뒤 4자리({phoneTail})</strong>입니다. 아래 순서대로
          눌러 보세요.
        </p>
      </div>

      <ol className="space-y-2">
        {STEPS.map((step, index) => (
          <li
            key={step.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-100 bg-white/90 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-charcoal">
                {index + 1}. {step.title}
              </p>
              <p className="text-xs text-muted">{step.description}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                onSelectTab(step.id === 'remaining' ? 'home' : step.id)
              }
              className={index === 0 ? btnGold : btnOutline}
            >
              {step.actionLabel}
            </button>
          </li>
        ))}
      </ol>

      <button type="button" onClick={onDismiss} className={`w-full ${btnOutline}`}>
        가이드 닫기 — 직접 둘러보기
      </button>
    </section>
  )
}
