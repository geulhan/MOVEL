import type { FeedAction, ActionPriority, ActionType } from '../../types/actionEngine'
import { btnGold, btnOutline, cardClass } from '../../styles/theme'

export const PRIORITY_LABEL: Record<ActionPriority, string> = {
  critical: '긴급',
  high: '오늘',
  medium: '이번 주',
  low: '여유',
}

export const TYPE_LABEL: Record<FeedAction['type'], string> = {
  renewal_message: '재등록',
  lead_contact: '상담 예정',
  lead_followup: '상담 팔로업',
  pt_checkin: 'PT 출석',
  class_checkin: '수업',
  payment_complete: '결제 대기',
  review_request: '후기',
  dormant_outreach: '휴면',
  birthday_coupon: '생일',
}

const TYPE_CHIP_CLASS: Record<FeedAction['type'], string> = {
  renewal_message: 'bg-amber-100 text-amber-900',
  lead_contact: 'bg-sky-100 text-sky-900',
  lead_followup: 'bg-sky-50 text-sky-800',
  pt_checkin: 'bg-emerald-100 text-emerald-900',
  class_checkin: 'bg-teal-100 text-teal-900',
  payment_complete: 'bg-gold/20 text-charcoal',
  review_request: 'bg-violet-100 text-violet-900',
  dormant_outreach: 'bg-orange-100 text-orange-900',
  birthday_coupon: 'bg-pink-100 text-pink-900',
}

const PRIORITY_CHIP_CLASS: Record<ActionPriority, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-900',
  medium: 'bg-charcoal/8 text-charcoal/70',
  low: 'bg-charcoal/5 text-charcoal/55',
}

export const FEED_SECTIONS: Array<{
  id: string
  label: string
  types: ActionType[]
}> = [
  { id: 'attendance', label: '출석 · 수업', types: ['pt_checkin', 'class_checkin'] },
  { id: 'payment', label: '결제', types: ['payment_complete'] },
  { id: 'retention', label: '재등록 · 회원 관리', types: ['renewal_message', 'dormant_outreach', 'birthday_coupon'] },
  { id: 'leads', label: '상담 · 리드', types: ['lead_contact', 'lead_followup'] },
  { id: 'other', label: '기타', types: ['review_request'] },
]

export function groupActionsBySection(
  actions: FeedAction[],
): Array<{ section: typeof FEED_SECTIONS[number]; actions: FeedAction[] }> {
  const used = new Set<string>()
  const groups: Array<{ section: typeof FEED_SECTIONS[number]; actions: FeedAction[] }> = []

  for (const section of FEED_SECTIONS) {
    const items = actions.filter((action) => {
      if (used.has(action.id)) return false
      if (!section.types.includes(action.type)) return false
      used.add(action.id)
      return true
    })
    if (items.length > 0) {
      groups.push({ section, actions: items })
    }
  }

  const rest = actions.filter((action) => !used.has(action.id))
  if (rest.length > 0) {
    groups.push({
      section: { id: 'misc', label: '기타', types: [] },
      actions: rest,
    })
  }

  return groups
}

function ActionChips({ action }: { action: FeedAction }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_CHIP_CLASS[action.type]}`}
      >
        {TYPE_LABEL[action.type]}
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_CHIP_CLASS[action.priority]}`}
      >
        {PRIORITY_LABEL[action.priority]}
      </span>
    </div>
  )
}

export function TodayFeedBriefing({
  dateLabel,
  totalCount,
  completedCount,
  remainingCount,
}: {
  dateLabel: string
  totalCount: number
  completedCount: number
  remainingCount: number
}) {
  const progress =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100

  return (
    <div className={`${cardClass} overflow-hidden border-gold/25 bg-gradient-to-br from-cream/80 to-white`}>
      <div className="px-5 py-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold">
          오늘 운영
        </p>
        <h2 className="mt-1 text-xl font-bold text-charcoal sm:text-2xl">
          {dateLabel}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {remainingCount > 0
            ? `남은 할 일 ${remainingCount}건 · 긴급부터 처리하세요`
            : totalCount > 0
              ? '오늘 할 일을 모두 처리했습니다'
              : '오늘 예정된 할 일이 없습니다'}
        </p>
        {totalCount > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-muted">
              <span>진행 {completedCount} / {totalCount}</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-charcoal/10">
              <div
                className="h-full rounded-full bg-gold transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function TodayFeedHeroAction({
  action,
  busy,
  onExecute,
}: {
  action: FeedAction
  busy: boolean
  onExecute: (action: FeedAction) => void
}) {
  return (
    <div className={`${cardClass} border-charcoal/15 ring-2 ring-gold/30`}>
      <div className="border-b border-gold/15 bg-charcoal px-5 py-2.5 sm:px-6">
        <p className="text-xs font-semibold text-cream/80">다음 할 일</p>
      </div>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0 flex-1">
          <ActionChips action={action} />
          <p className="mt-2 text-lg font-bold text-charcoal">{action.title}</p>
          <p className="mt-1 text-sm text-charcoal/85">{action.reason}</p>
          {action.meta && (
            <p className="mt-0.5 text-sm text-muted">{action.meta}</p>
          )}
          <p className="mt-2 text-xs text-muted">{action.deadlineLabel}</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onExecute(action)}
          className={`${btnGold} w-full shrink-0 sm:w-auto sm:min-w-[7rem]`}
        >
          {busy ? '처리 중…' : action.nextAction}
        </button>
      </div>
    </div>
  )
}

export function TodayFeedActionRow({
  action,
  busy,
  onExecute,
  compact,
}: {
  action: FeedAction
  busy: boolean
  onExecute: (action: FeedAction) => void
  compact?: boolean
}) {
  return (
    <li
      className={`flex items-start gap-3 ${compact ? 'py-3' : 'border-b border-charcoal/8 py-4 last:border-b-0'}`}
    >
      <div className="min-w-0 flex-1">
        {!compact && <ActionChips action={action} />}
        <p className={`font-semibold text-charcoal ${compact ? 'text-sm' : 'mt-1.5 text-base'}`}>
          {action.title}
        </p>
        <p className="mt-0.5 text-sm text-charcoal/75">{action.reason}</p>
        {action.meta && (
          <p className="mt-0.5 text-xs text-muted">{action.meta}</p>
        )}
        {!compact && (
          <p className="mt-1 text-xs text-muted">{action.deadlineLabel}</p>
        )}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => onExecute(action)}
        className={`${btnOutline} mt-0.5 shrink-0 text-xs sm:text-sm`}
      >
        {busy ? '…' : action.nextAction}
      </button>
    </li>
  )
}

export function TodayFeedSection({
  label,
  actions,
  heroActionId,
  actingId,
  onExecute,
}: {
  label: string
  actions: FeedAction[]
  heroActionId: string | null
  actingId: string | null
  onExecute: (action: FeedAction) => void
}) {
  const items = actions.filter((action) => action.id !== heroActionId)
  if (items.length === 0) return null

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="flex items-center justify-between border-b border-gold/15 px-4 py-3 sm:px-5">
        <h3 className="text-sm font-semibold text-charcoal">{label}</h3>
        <span className="rounded-full bg-charcoal/8 px-2.5 py-0.5 text-xs font-medium tabular-nums text-charcoal/70">
          {items.length}건
        </span>
      </div>
      <ul className="divide-y divide-charcoal/8 px-4 sm:px-5">
        {items.map((action) => (
          <TodayFeedActionRow
            key={action.id}
            action={action}
            busy={actingId === action.id}
            onExecute={onExecute}
            compact={items.length > 3}
          />
        ))}
      </ul>
    </section>
  )
}

export function TodayFeedAllDone({
  completedCount,
  isTrainer,
}: {
  completedCount: number
  isTrainer: boolean
}) {
  return (
    <div className={`${cardClass} border-dashed border-emerald-300/60 bg-emerald-50/40 px-6 py-14 text-center`}>
      <p className="text-3xl" aria-hidden>✓</p>
      <p className="mt-3 text-lg font-semibold text-charcoal">
        오늘 할 일을 모두 처리했습니다
      </p>
      {completedCount > 0 && (
        <p className="mt-1 text-sm text-muted">
          오늘 {completedCount}건 처리함
        </p>
      )}
      {!isTrainer && (
        <p className="mt-4 text-sm text-muted">
          매출·지표는{' '}
          <span className="font-medium text-charcoal">경영 인사이트</span>에서
          확인하세요.
        </p>
      )}
    </div>
  )
}

export function TodayFeedEmptyDay({ isTrainer }: { isTrainer: boolean }) {
  return (
    <div className={`${cardClass} border-dashed border-charcoal/15 bg-cream/40 px-6 py-14 text-center`}>
      <p className="text-lg font-semibold text-charcoal">오늘 예정된 할 일이 없습니다</p>
      <p className="mt-2 text-sm text-muted">
        새로고침으로 최신 목록을 불러올 수 있습니다.
      </p>
      {!isTrainer && (
        <p className="mt-4 text-sm text-muted">
          통계는 경영 인사이트에서 확인하세요.
        </p>
      )}
    </div>
  )
}
