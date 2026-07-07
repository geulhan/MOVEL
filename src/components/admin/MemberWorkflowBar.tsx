import { Link } from 'react-router-dom'
import { buildMemberWorkflowSteps } from '../../lib/memberWorkflow'
import { useCenterFeatures } from '../../hooks/useCenterFeatures'
import { useMemberDetail } from '../member-detail/MemberDetailContext'
import { cardClass } from '../../styles/theme'

export function MemberWorkflowBar() {
  const { member, memberId, payments, attendance } = useMemberDetail()
  const { features } = useCenterFeatures()

  if (!member) return null

  const steps = buildMemberWorkflowSteps({
    memberId,
    member,
    payments,
    attendance,
    features,
  })

  const doneCount = steps.filter((step) => step.done).length

  return (
    <section className={`${cardClass} card-pad`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-charcoal">회원 여정</h3>
          <p className="text-xs text-muted">
            {doneCount}/{steps.length}단계 완료
          </p>
        </div>
      </div>
      <ol className="mt-4 flex flex-wrap gap-2">
        {steps.map((step, index) => (
          <li key={step.id}>
            <Link
              to={step.href}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                step.done
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-gold/40 bg-cream/50 text-charcoal hover:border-gold/60'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  step.done ? 'bg-emerald-500 text-white' : 'bg-white text-charcoal/40'
                }`}
              >
                {step.done ? '✓' : index + 1}
              </span>
              {step.label}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
