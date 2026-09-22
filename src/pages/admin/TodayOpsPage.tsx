import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchActionFeedSnapshot } from '../../api/actionFeed'
import { sendRenewalMessageForMember } from '../../api/messageCampaigns'
import {
  groupActionsBySection,
  TodayFeedAllDone,
  TodayFeedBriefing,
  TodayFeedEmptyDay,
  TodayFeedHeroAction,
  TodayFeedSection,
} from '../../components/admin/TodayFeed'
import { PageHeader } from '../../components/admin/PageHeader'
import { useCenterFeatures } from '../../hooks/useCenterFeatures'
import { isTrainerStaff } from '../../lib/adminPermissions'
import { getAdminSession } from '../../lib/adminSession'
import { formatSupabaseError } from '../../lib/errors'
import { PAGE_HELP } from '../../lib/pageHelpTips'
import { isClassFeatureEnabled } from '../../types/centerFeatures'
import type { ActionFeedSnapshot, FeedAction } from '../../types/actionEngine'
import { btnOutline } from '../../styles/theme'

export default function TodayOpsPage() {
  const navigate = useNavigate()
  const { features } = useCenterFeatures()
  const session = getAdminSession()
  const isTrainer = isTrainerStaff(session)
  const trainerId = isTrainer ? session?.trainerId : undefined

  const [data, setData] = useState<ActionFeedSnapshot | null>(null)
  const [initialTotal, setInitialTotal] = useState(0)
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
      setInitialTotal(snapshot.actions.length)
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

  const heroAction = visibleActions[0] ?? null
  const completedCount = dismissedIds.size
  const sections = useMemo(
    () => groupActionsBySection(visibleActions),
    [visibleActions],
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

  const showBriefing = !loading || data

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="오늘 할 일"
        description="긴급한 일부터 처리하세요. 숫자·매출은 경영 인사이트에서 확인합니다."
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

      {showBriefing && (
        <TodayFeedBriefing
          dateLabel={data?.dateLabel ?? '오늘'}
          totalCount={initialTotal}
          completedCount={completedCount}
          remainingCount={visibleActions.length}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {loading && !data
            ? '오늘 일정 불러오는 중…'
            : visibleActions.length > 0
              ? `남은 ${visibleActions.length}건`
              : initialTotal > 0
                ? '처리 완료'
                : '할 일 없음'}
        </p>
        <button type="button" onClick={() => void load()} className={btnOutline}>
          새로고침
        </button>
      </div>

      {loading && !data ? (
        <p className="py-12 text-center text-sm text-muted">불러오는 중…</p>
      ) : visibleActions.length > 0 ? (
        <div className="space-y-4">
          {heroAction && (
            <TodayFeedHeroAction
              action={heroAction}
              busy={actingId === heroAction.id}
              onExecute={(row) => void handleExecute(row)}
            />
          )}
          {sections.map(({ section, actions }) => (
            <TodayFeedSection
              key={section.id}
              label={section.label}
              actions={actions}
              heroActionId={heroAction?.id ?? null}
              actingId={actingId}
              onExecute={(row) => void handleExecute(row)}
            />
          ))}
        </div>
      ) : initialTotal > 0 ? (
        <TodayFeedAllDone completedCount={completedCount} isTrainer={isTrainer} />
      ) : (
        <TodayFeedEmptyDay isTrainer={isTrainer} />
      )}

      {!isTrainer && !loading && (
        <p className="text-center text-xs text-muted">
          <Link to="/admin/business-analytics" className="font-medium text-charcoal underline">
            경영 인사이트
          </Link>
          에서 이번 달 매출·순이익을 확인할 수 있습니다.
        </p>
      )}
    </div>
  )
}
