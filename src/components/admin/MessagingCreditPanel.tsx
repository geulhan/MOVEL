import { useCallback, useEffect, useState } from 'react'
import {
  fetchCenterMessageDashboard,
  INSUFFICIENT_CREDITS_MESSAGE,
  updateCenterNotificationsEnabled,
} from '../../api/messageCredits'
import { cardClass } from '../../styles/theme'
import type { CenterMessageDashboard } from '../../types/messageCredits'

type Props = {
  onUpdated?: () => void
}

export function MessagingCreditPanel({ onUpdated }: Props) {
  const [dashboard, setDashboard] = useState<CenterMessageDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await fetchCenterMessageDashboard()
      setDashboard(next)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '메시지 정보를 불러올 수 없습니다.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleToggle(enabled: boolean) {
    setSaving(true)
    setError(null)
    try {
      const next = await updateCenterNotificationsEnabled(enabled)
      setDashboard(next)
      onUpdated?.()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '설정을 저장할 수 없습니다.',
      )
    } finally {
      setSaving(false)
    }
  }

  const credits = dashboard?.credits

  return (
    <section className={`${cardClass} space-y-4 p-4 sm:p-5`}>
      <div>
        <h2 className="text-sm font-semibold text-charcoal">메시지 크레딧</h2>
        <p className="mt-1 text-sm text-muted">
          알림톡·문자는 구독과 별도로 크레딧이 차감됩니다. (발송 1건 = 1크레딧)
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="잔여 메시지"
          value={loading ? '…' : `${credits?.balance.toLocaleString() ?? 0}건`}
          highlight
        />
        <StatCard
          label="이번 달 사용"
          value={loading ? '…' : `${credits?.monthUsed.toLocaleString() ?? 0}건`}
          sub={
            credits
              ? `알림톡 ${credits.monthAlimtalk} · 문자 ${credits.monthSms}`
              : undefined
          }
        />
        <StatCard
          label="누적 사용"
          value={loading ? '…' : `${credits?.totalUsed.toLocaleString() ?? 0}건`}
          sub={
            credits && credits.monthFailed > 0
              ? `이번 달 실패 ${credits.monthFailed}건`
              : undefined
          }
        />
      </div>

      <label className="flex items-center justify-between gap-4 rounded-xl border border-gold/25 bg-cream/30 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-charcoal">알림톡 사용</p>
          <p className="mt-0.5 text-xs text-muted">
            켜면 자동·수동 발송 시 크레딧이 차감됩니다.
          </p>
        </div>
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={dashboard?.notificationsEnabled ?? false}
          disabled={loading || saving}
          onChange={(e) => void handleToggle(e.target.checked)}
        />
      </label>

      {dashboard &&
        !dashboard.notificationsEnabled &&
        (credits?.balance ?? 0) <= 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {INSUFFICIENT_CREDITS_MESSAGE} MotionHub에 크레딧 지급을 요청해 주세요.
          </p>
        )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
          <span className="mt-1 block text-xs">
            Supabase에서 migration_065_message_credit_system.sql을 실행했는지
            확인하세요.
          </span>
        </p>
      )}
    </section>
  )
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        highlight ? 'border-charcoal/25 bg-charcoal text-cream' : 'border-gold/25 bg-white'
      }`}
    >
      <p
        className={`text-xs font-medium ${highlight ? 'text-cream/70' : 'text-muted'}`}
      >
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${highlight ? '' : 'text-charcoal'}`}>
        {value}
      </p>
      {sub && (
        <p className={`mt-1 text-xs ${highlight ? 'text-cream/65' : 'text-muted'}`}>
          {sub}
        </p>
      )}
    </div>
  )
}
