import { Link } from 'react-router-dom'
import { useBetaStart } from '../../contexts/BetaStartContext'
import { PageHeader } from '../../components/admin/PageHeader'
import { getMemberPortalUrl } from '../../lib/siteUrl'
import { PAGE_HELP } from '../../lib/pageHelpTips'
import type { BetaStartStep } from '../../lib/betaStartSteps'
import { btnGold, btnOutline, cardClass } from '../../styles/theme'

function StepRow({
  step,
  isNext,
  memberPortalUrl,
}: {
  step: BetaStartStep
  isNext: boolean
  memberPortalUrl: string
}) {
  const actionClass = isNext ? btnGold : btnOutline

  const action = step.external ? (
    <a href={memberPortalUrl} target="_blank" rel="noreferrer" className={actionClass}>
      {step.actionLabel}
    </a>
  ) : (
    <Link to={step.actionTo} className={actionClass}>
      {step.actionLabel}
    </Link>
  )

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
          <p className="mt-1 pl-10 text-sm leading-relaxed text-muted">{step.description}</p>
        </div>
        {!step.done && <div className="shrink-0">{action}</div>}
      </div>
    </li>
  )
}

export default function BetaStartPage() {
  const { steps, percent, complete, nextStep, loading, refresh, progress } = useBetaStart()
  const memberPortalUrl = getMemberPortalUrl(progress?.centerSlug)

  if (loading) {
    return (
      <section className={`${cardClass} p-6 text-sm text-muted`}>
        베타 시작하기 진행 상황을 불러오는 중…
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="베타 시작하기"
        description="가입 후 아래 6가지를 한 번씩 사용해 보세요."
        helpText={PAGE_HELP.betaStart}
      />

      <section
        className={`${cardClass} space-y-5 border-gold/35 bg-gradient-to-br from-cream/80 to-white p-6`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
              현재 진행률
            </p>
            <h2 className="mt-1 text-lg font-bold text-charcoal">
              {complete
                ? '모든 단계를 완료했습니다'
                : '모션허브 핵심 기능을 체험해 보세요'}
            </h2>
            {!complete && (
              <p className="mt-1 text-sm text-muted">
                각 단계를 완료할 때마다 진행률이 올라갑니다.
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold tabular-nums text-charcoal">{percent}%</p>
          </div>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-charcoal/8">
          <div
            className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-500' : 'bg-gold'}`}
            style={{ width: `${percent}%` }}
          />
        </div>

        {complete ? (
          <div className="rounded-2xl border border-emerald-300/80 bg-gradient-to-br from-emerald-50 to-white px-6 py-10 text-center">
            <p className="text-3xl" aria-hidden>
              🎉
            </p>
            <h3 className="mt-4 text-xl font-bold text-charcoal">
              모션허브를 사용할 준비가 완료되었습니다.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              회원 관리 · 예약 · 출석 · 운동일지 · AI 리포트까지 모두 확인했습니다.
            </p>
            <div className="mt-6">
              <Link to="/admin" className={btnGold}>
                대시보드로 이동
              </Link>
            </div>
          </div>
        ) : (
          nextStep && (
            <div className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3">
              <p className="text-xs font-semibold text-gold-dark">다음에 할 일</p>
              <p className="mt-1 text-sm font-semibold text-charcoal">{nextStep.title}</p>
              <p className="mt-0.5 text-sm text-charcoal/75">{nextStep.description}</p>
              <div className="mt-3">
                {nextStep.external ? (
                  <a
                    href={memberPortalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={btnGold}
                  >
                    {nextStep.actionLabel}
                  </a>
                ) : (
                  <Link to={nextStep.actionTo} className={btnGold}>
                    {nextStep.actionLabel}
                  </Link>
                )}
              </div>
            </div>
          )
        )}

        <ol className="space-y-2" aria-label="베타 시작하기 체크리스트">
          {steps.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              isNext={!complete && nextStep?.id === step.id}
              memberPortalUrl={memberPortalUrl}
            />
          ))}
        </ol>

        <div className="border-t border-charcoal/8 pt-3">
          <button type="button" onClick={() => void refresh()} className={btnOutline}>
            진행 상황 새로고침
          </button>
        </div>
      </section>
    </div>
  )
}
