import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchActionFeedSnapshot } from '../../api/actionFeed'
import { sendRenewalMessageForMember } from '../../api/messageCampaigns'
import { PageHeader } from '../../components/admin/PageHeader'
import { useCenterFeatures } from '../../hooks/useCenterFeatures'
import { isTrainerStaff } from '../../lib/adminPermissions'
import { getAdminSession } from '../../lib/adminSession'
import { formatSupabaseError } from '../../lib/errors'
import { PAGE_HELP } from '../../lib/pageHelpTips'
import { isClassFeatureEnabled } from '../../types/centerFeatures'
import type { ActionFeedSnapshot, FeedAction } from '../../types/actionEngine'
import { btnGold, btnOutline } from '../../styles/theme'

const PRIORITY_DOT: Record<FeedAction['priority'], string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-emerald-500',
  low: 'bg-violet-500',
}

const TYPE_LABEL: Record<FeedAction['type'], string> = {
  renewal_message: '재등록 필요',
  lead_contact: '상담 예정',
  lead_followup: '상담 팔로업',
  pt_checkin: '출석 필요',
  class_checkin: '오늘 수업',
  payment_complete: '결제 대기',
  review_request: '후기 요청',
  dormant_outreach: '휴면 위험',
  birthday_coupon: '생일 쿠폰',
}

function FeedRow({
  action,
  busy,
  onExecute,
}: {
  action: FeedAction
  busy: boolean
  onExecute: (action: FeedAction) => void
}) {
  return (
    <li className="flex items-start gap-3 border-b border-charcoal/10 px-1 py-4 last:border-b-0">
      <span
        className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_DOT[action.priority]}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-charcoal/50">
          {TYPE_LABEL[action.type]}
        </p>
        <p className="mt-0.5 text-base font-semibold text-charcoal">{action.title}</p>
        <p className="mt-1 text-sm text-charcoal/80">{action.reason}</p>
        {action.meta && (
          <p className="mt-0.5 text-sm text-muted">{action.meta}</p>
        )}
        <p className="mt-1 text-xs text-muted">{action.deadlineLabel}</p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => onExecute(action)}
        className={`${btnGold} mt-1 shrink-0 min-w-[4.5rem]`}
      >
        {busy ? '처리 중…' : action.nextAction}
      </button>
    </li>
  )
}

export default function TodayOpsPage() {
  const navigate = useNavigate()
  const { features } = useCenterFeatures()
  const session = getAdminSession()
  const isTrainer = isTrainerStaff(session)
  const trainerId = isTrainer ? session?.trainerId : undefined

  const [data, setData] = useState<ActionFeedSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [actingId, setActingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const snapshot = await fetchActionFeedSnapshot({
        includeClass: isClassFeatureEnabled(features),
        trainerId,
      })
      setData(snapshot)
      setDismissedIds(new Set())
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }, [features, trainerId])

  useEffect(() => {
    void load()
  }, [load])

  const visibleActions = useMemo(
    () => data?.actions.filter((action) => !dismissedIds.has(action.id)) ?? [],
    [data, dismissedIds],
  )

  async function handleExecute(action: FeedAction) {
    setToast(null)
    setActingId(action.id)

    try {
      if (action.execute === 'send_renewal') {
        if (!action.memberId) throw new Error('회원 정보가 없습니다.')
        if (
          !window.confirm(`${action.title}님에게 재등록 알림톡을 보낼까요?`)
        ) {
          return
        }
        const result = await sendRenewalMessageForMember(action.memberId)
        if (result.ok && result.status === 'sent') {
          setToast(`${action.title}님에게 알림톡을 발송했습니다.`)
          setDismissedIds((prev) => new Set(prev).add(action.id))
        } else if (result.status === 'skipped') {
          setToast(result.skippedReason ?? '이미 발송되었거나 생략되었습니다.')
          setDismissedIds((prev) => new Set(prev).add(action.id))
        } else {
          setToast(result.error ?? '발송에 실패했습니다.')
        }
        return
      }

      if (action.href) {
        navigate(action.href)
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : '처리에 실패했습니다.')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Today Feed"
        description={`${data?.dateLabel ?? '오늘'} · 위에서 아래로 처리하세요. 통계는 경영 인사이트에서 확인합니다.`}
        helpText={PAGE_HELP.todayOps}
      />

      {error && (
        <div className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {toast && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {loading && !data
            ? 'Action Engine 분석 중…'
            : visibleActions.length > 0
              ? `${visibleActions.length}건 · Critical → Low 순`
              : '오늘 처리할 Action이 없습니다'}
        </p>
        <button type="button" onClick={() => void load()} className={btnOutline}>
          새로고침
        </button>
      </div>

      {loading && !data ? (
        <p className="py-12 text-center text-sm text-muted">Today Feed 불러오는 중…</p>
      ) : visibleActions.length > 0 ? (
        <ul className="rounded-xl border border-charcoal/10 bg-white px-4">
          {visibleActions.map((action) => (
            <FeedRow
              key={action.id}
              action={action}
              busy={actingId === action.id}
              onExecute={(row) => void handleExecute(row)}
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-charcoal/15 bg-cream/40 px-4 py-16 text-center text-sm text-muted">
          모든 Action을 처리했습니다.
          <br />
          {!isTrainer && (
            <span className="mt-2 inline-block">
              매출·지표는 경영 인사이트에서 확인하세요.
            </span>
          )}
        </p>
      )}
    </div>
  )
}
