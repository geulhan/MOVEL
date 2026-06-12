import { useCallback, useEffect, useState } from 'react'
import {
  fetchMessageLogs,
  triggerPtReminders,
  triggerRenewalReminders,
} from '../../api/notifications'
import { MessageCampaignPanel } from '../../components/admin/MessageCampaignPanel'
import { PageHeader } from '../../components/admin/PageHeader'
import type { MessageCampaignKind } from '../../api/messageCampaigns'
import {
  MESSAGE_STATUS_LABELS,
  MESSAGE_TEMPLATE_LABELS,
  type MessageLog,
} from '../../types/database'

const SEND_TABS: Array<{ id: MessageCampaignKind; label: string }> = [
  { id: 'welcome', label: '신규회원' },
  { id: 'payment_done', label: '결제안내' },
  { id: 'renewal', label: '재등록' },
  { id: 'pt_reminder', label: 'PT 리마인더' },
]

function formatWhen(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<MessageCampaignKind>('welcome')
  const [logs, setLogs] = useState<MessageLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [cronMessage, setCronMessage] = useState<string | null>(null)
  const [cronLoading, setCronLoading] = useState(false)
  const [ptCronLoading, setPtCronLoading] = useState(false)

  const loadLogs = useCallback(async () => {
    setLogsLoading(true)
    setLogsError(null)
    try {
      setLogs(await fetchMessageLogs(100))
    } catch (err) {
      setLogsError(
        err instanceof Error ? err.message : '발송 이력을 불러올 수 없습니다.',
      )
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  async function handleRunPtReminders() {
    setPtCronLoading(true)
    setCronMessage(null)
    try {
      const result = await triggerPtReminders()
      const processed =
        result && typeof result === 'object' && 'processed' in result
          ? Number((result as { processed: number }).processed)
          : 0
      setCronMessage(`PT D-1 리마인더 실행 완료 (${processed}건)`)
      await loadLogs()
    } catch (err) {
      setCronMessage(
        err instanceof Error ? err.message : 'PT 리마인더 실행에 실패했습니다.',
      )
    } finally {
      setPtCronLoading(false)
    }
  }

  async function handleRunRenewalReminders() {
    setCronLoading(true)
    setCronMessage(null)
    try {
      const result = await triggerRenewalReminders()
      const processed =
        result && typeof result === 'object' && 'processed' in result
          ? Number((result as { processed: number }).processed)
          : 0
      setCronMessage(`갱신 안내 일괄 실행 완료 (${processed}건)`)
      await loadLogs()
    } catch (err) {
      setCronMessage(
        err instanceof Error ? err.message : '갱신 안내 실행에 실패했습니다.',
      )
    } finally {
      setCronLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="메시지 발송"
        description="회원 유형별로 알림톡을 확인하고 수동 발송할 수 있습니다."
      />

      <nav className="chip-scroll -mx-1 px-1">
        {SEND_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`chip ${
              activeTab === tab.id ? 'chip-active' : 'chip-inactive'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <MessageCampaignPanel kind={activeTab} onSent={() => void loadLogs()} />

      <section className="space-y-4 rounded-xl border border-gold/30 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-charcoal">발송 이력</h2>
            <p className="mt-1 text-sm text-muted">
              최근 알림톡·문자 발송 기록입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleRunPtReminders()}
              disabled={ptCronLoading}
              className="rounded-lg border border-gold/40 px-4 py-2 text-sm font-medium text-charcoal transition hover:bg-cream disabled:opacity-50"
            >
              {ptCronLoading ? '실행 중…' : 'PT D-1 리마인더 실행'}
            </button>
            <button
              type="button"
              onClick={() => void handleRunRenewalReminders()}
              disabled={cronLoading}
              className="rounded-lg border border-gold/40 px-4 py-2 text-sm font-medium text-charcoal transition hover:bg-cream disabled:opacity-50"
            >
              {cronLoading ? '실행 중…' : '재등록 D-7·3·1 일괄 실행'}
            </button>
            <button
              type="button"
              onClick={() => void loadLogs()}
              className="rounded-lg border border-gold/40 px-4 py-2 text-sm font-medium text-charcoal transition hover:bg-cream"
            >
              새로고침
            </button>
          </div>
        </div>
        {cronMessage && <p className="text-sm text-muted">{cronMessage}</p>}

        {logsError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {logsError}
            <p className="mt-1 text-xs">
              Supabase에서 migration_016_notifications.sql을 실행했는지
              확인하세요.
            </p>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gold/20">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gold/20 bg-cream/60 text-left text-xs text-muted">
                <th className="px-4 py-3 font-semibold">시간</th>
                <th className="px-4 py-3 font-semibold">종류</th>
                <th className="px-4 py-3 font-semibold">수신번호</th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="px-4 py-3 font-semibold">비고</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    불러오는 중…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    발송 이력이 없습니다.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-gold/10">
                    <td className="px-4 py-3 whitespace-nowrap text-charcoal">
                      {formatWhen(log.sent_at ?? log.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {MESSAGE_TEMPLATE_LABELS[log.template_key]}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                      {log.phone}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-muted">
                      {log.error_message ?? log.provider_message_id ?? '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: MessageLog['status'] }) {
  const label = MESSAGE_STATUS_LABELS[status]
  const className =
    status === 'sent'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'failed'
        ? 'bg-red-100 text-red-800'
        : status === 'skipped'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-gray-100 text-gray-700'

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}
