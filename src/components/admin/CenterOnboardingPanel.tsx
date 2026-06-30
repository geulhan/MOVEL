import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchCenterOnboardingProgress,
  type CenterOnboardingProgress,
} from '../../api/centerOnboarding'
import {
  buildGettingStartedSteps,
  gettingStartedPercent,
  isGettingStartedComplete,
  nextGettingStartedStep,
  type GettingStartedStep,
} from '../../lib/centerOnboardingSteps'
import {
  dismissCenterOnboarding,
  isCenterOnboardingDismissed,
} from '../../lib/centerOnboardingStorage'
import { btnGold, btnOutline, cardClass } from '../../styles/theme'

type Props = {
  compact?: boolean
  onProgressChange?: (progress: CenterOnboardingProgress | null) => void
}

function ChecklistRow({
  step,
  isNext,
}: {
  step: GettingStartedStep
  isNext: boolean
}) {
  return (
    <li
      className={`rounded-xl border px-4 py-3 ${
        step.done
          ? 'border-emerald-200 bg-emerald-50/70'
          : isNext
            ? 'border-gold/50 bg-cream/60'
            : 'border-charcoal/10 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-sm font-bold ${
                step.done
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-charcoal/25 bg-white text-charcoal/35'
              }`}
              aria-hidden
            >
              {step.done ? '✓' : '□'}
            </span>
            <p
              className={`font-semibold ${step.done ? 'text-charcoal/70 line-through decoration-charcoal/30' : 'text-charcoal'}`}
            >
              {step.title}
            </p>
          </div>
          <p className="mt-1 pl-10 text-sm leading-relaxed text-muted">
            {step.description}
          </p>
        </div>
        {!step.done && (
          <Link
            to={step.actionTo}
            className={`shrink-0 ${isNext ? btnGold : btnOutline}`}
          >
            {step.actionLabel}
          </Link>
        )}
      </div>
    </li>
  )
}

function CompletionCelebration() {
  return (
    <div className="rounded-2xl border border-emerald-300/80 bg-gradient-to-br from-emerald-50 to-white px-6 py-8 text-center">
      <p className="text-3xl" aria-hidden>
        🎉
      </p>
      <h3 className="mt-3 text-xl font-bold text-charcoal">축하합니다.</h3>
      <p className="mt-2 text-base leading-relaxed text-charcoal/80">
        MotionHub 기본 설정이 완료되었습니다.
      </p>
      <p className="mt-2 text-sm text-muted">
        회원 관리 · 예약 · 출석 · 운동일지 · AI 리포트까지 준비되었습니다.
      </p>
    </div>
  )
}

export function CenterOnboardingPanel({ compact = false, onProgressChange }: Props) {
  const [progress, setProgress] = useState<CenterOnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchCenterOnboardingProgress()
      setProgress(data)
      setDismissed(isCenterOnboardingDismissed(data.centerId))
      onProgressChange?.(data)
    } catch {
      setProgress(null)
      onProgressChange?.(null)
    } finally {
      setLoading(false)
    }
  }, [onProgressChange])

  useEffect(() => {
    void load()
  }, [load])

  const steps = useMemo(
    () => (progress ? buildGettingStartedSteps(progress) : []),
    [progress],
  )
  const percent = gettingStartedPercent(steps)
  const nextStep = nextGettingStartedStep(steps)
  const complete = isGettingStartedComplete(steps)

  function handleDismiss() {
    if (!progress) return
    dismissCenterOnboarding(progress.centerId)
    setDismissed(true)
  }

  if (loading) {
    return (
      <section className={`${cardClass} p-5 text-sm text-muted`}>
        처음 시작하기 체크리스트를 불러오는 중…
      </section>
    )
  }

  if (!progress || dismissed) return null
  if (compact && complete) return null

  return (
    <section
      className={`${cardClass} space-y-4 border-gold/35 bg-gradient-to-br from-cream/80 to-white p-5`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
            처음 시작하기
          </p>
          <h2 className="mt-1 text-lg font-bold text-charcoal">
            {complete ? '모든 항목을 완료했습니다' : '센터 운영을 위한 7가지 단계'}
          </h2>
          {!complete && (
            <p className="mt-1 text-sm text-muted">
              하나씩 체크해 나가면 5분 안에 MotionHub를 시작할 수 있습니다.
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums text-charcoal">{percent}%</p>
          <p className="text-xs text-muted">완료율</p>
        </div>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-charcoal/8">
        <div
          className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-500' : 'bg-gold'}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {complete ? (
        <CompletionCelebration />
      ) : (
        nextStep && (
          <div className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3">
            <p className="text-xs font-semibold text-gold-dark">다음에 할 일</p>
            <p className="mt-1 text-sm font-semibold text-charcoal">{nextStep.title}</p>
            <p className="mt-0.5 text-sm text-charcoal/75">{nextStep.description}</p>
            <div className="mt-3">
              <Link to={nextStep.actionTo} className={btnGold}>
                {nextStep.actionLabel}
              </Link>
            </div>
          </div>
        )
      )}

      {!compact && (
        <ol className="space-y-2" aria-label="처음 시작하기 체크리스트">
          {steps.map((step) => (
            <ChecklistRow
              key={step.id}
              step={step}
              isNext={!complete && nextStep?.id === step.id}
            />
          ))}
        </ol>
      )}

      <div className="flex flex-wrap gap-2 border-t border-charcoal/8 pt-3">
        <button type="button" onClick={() => void load()} className={btnOutline}>
          진행 상황 새로고침
        </button>
        {complete && (
          <button type="button" onClick={handleDismiss} className={btnOutline}>
            체크리스트 닫기
          </button>
        )}
      </div>
    </section>
  )
}
