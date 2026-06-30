import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchCenterOnboardingProgress,
  type CenterOnboardingProgress,
} from '../../api/centerOnboarding'
import {
  buildCenterOnboardingSteps,
  isOnboardingComplete,
  nextOnboardingStep,
  onboardingCompletionPercent,
  type CenterOnboardingStep,
} from '../../lib/centerOnboardingSteps'
import {
  dismissCenterOnboarding,
  isCenterOnboardingDismissed,
  markMemberPortalShared,
} from '../../lib/centerOnboardingStorage'
import { getMemberPortalUrl } from '../../constants/motionhubGuide'
import { copyText } from '../../lib/siteUrl'
import { btnGold, btnOutline, cardClass } from '../../styles/theme'

type Props = {
  compact?: boolean
  onProgressChange?: (progress: CenterOnboardingProgress | null) => void
}

function StepRow({
  step,
  isNext,
  onCopyPortal,
}: {
  step: CenterOnboardingStep
  isNext: boolean
  onCopyPortal?: () => void
}) {
  const isPortalCopy = step.id === 'member_portal' && !step.done

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
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step.done
                  ? 'bg-emerald-600 text-white'
                  : isNext
                    ? 'bg-gold text-charcoal'
                    : 'bg-charcoal/10 text-charcoal/60'
              }`}
            >
              {step.done ? '✓' : '·'}
            </span>
            <p className="font-semibold text-charcoal">{step.title}</p>
          </div>
          <p className="mt-1 pl-8 text-sm leading-relaxed text-muted">{step.description}</p>
        </div>
        {!step.done && (
          <div className="shrink-0">
            {isPortalCopy && onCopyPortal ? (
              <button type="button" onClick={onCopyPortal} className={btnGold}>
                {step.actionLabel}
              </button>
            ) : (
              <Link
                to={step.actionTo}
                className={isNext ? btnGold : btnOutline}
              >
                {step.actionLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

export function CenterOnboardingPanel({ compact = false, onProgressChange }: Props) {
  const [progress, setProgress] = useState<CenterOnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)

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
    () => (progress ? buildCenterOnboardingSteps(progress) : []),
    [progress],
  )
  const percent = onboardingCompletionPercent(steps)
  const nextStep = nextOnboardingStep(steps)
  const complete = isOnboardingComplete(steps)

  async function handleCopyPortalLink() {
    if (!progress) return
    const url = getMemberPortalUrl(progress.centerSlug)
    const ok = await copyText(url)
    if (ok) {
      markMemberPortalShared(progress.centerId)
      setCopyMessage('회원 앱 링크를 복사했습니다. 회원에게 카톡으로 보내 주세요.')
      void load()
    } else {
      setCopyMessage('복사에 실패했습니다. 링크를 직접 선택해 복사해 주세요.')
    }
    window.setTimeout(() => setCopyMessage(null), 4000)
  }

  function handleDismiss() {
    if (!progress) return
    dismissCenterOnboarding(progress.centerId)
    setDismissed(true)
  }

  if (loading) {
    return (
      <section className={`${cardClass} p-5 text-sm text-muted`}>
        시작 가이드를 불러오는 중…
      </section>
    )
  }

  if (!progress || (dismissed && complete)) return null
  if (compact && complete) return null

  return (
    <section
      className={`${cardClass} space-y-4 border-gold/35 bg-gradient-to-br from-cream/80 to-white p-5`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
            5분 시작 가이드
          </p>
          <h2 className="mt-1 text-lg font-bold text-charcoal">
            {complete
              ? '첫 설정이 완료되었습니다'
              : '다음 단계만 따라가면 바로 사용할 수 있습니다'}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {complete
              ? '회원 앱·예약·운동기록까지 연결되었습니다. 이제 MotionHub를 운영해 보세요.'
              : '가입부터 첫 회원 체험까지 — 길을 잃지 않도록 단계별로 안내합니다.'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-charcoal">{percent}%</p>
          <p className="text-xs text-muted">진행률</p>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-charcoal/8">
        <div
          className="h-full rounded-full bg-gold transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      {nextStep && !complete && (
        <div className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3">
          <p className="text-xs font-semibold text-gold-dark">지금 할 일</p>
          <p className="mt-1 text-sm font-semibold text-charcoal">{nextStep.title}</p>
          <p className="mt-0.5 text-sm text-charcoal/75">{nextStep.description}</p>
          <div className="mt-3">
            {nextStep.id === 'member_portal' ? (
              <button type="button" onClick={() => void handleCopyPortalLink()} className={btnGold}>
                {nextStep.actionLabel}
              </button>
            ) : (
              <Link to={nextStep.actionTo} className={btnGold}>
                {nextStep.actionLabel}
              </Link>
            )}
          </div>
        </div>
      )}

      {!compact && (
        <ol className="space-y-2">
          {steps.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              isNext={nextStep?.id === step.id}
              onCopyPortal={() => void handleCopyPortalLink()}
            />
          ))}
        </ol>
      )}

      {copyMessage && (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          {copyMessage}
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-charcoal/8 pt-3">
        {!complete && (
          <button type="button" onClick={() => void load()} className={btnOutline}>
            진행 상황 새로고침
          </button>
        )}
        {complete && (
          <button type="button" onClick={handleDismiss} className={btnOutline}>
            가이드 닫기
          </button>
        )}
      </div>
    </section>
  )
}
