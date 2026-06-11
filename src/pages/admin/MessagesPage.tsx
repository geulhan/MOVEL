import { useCallback, useEffect, useState } from 'react'
import {
  fetchMessageLogs,
  triggerRenewalReminders,
} from '../../api/notifications'
import { PageHeader } from '../../components/admin/PageHeader'
import {
  MESSAGE_STATUS_LABELS,
  MESSAGE_TEMPLATE_LABELS,
  type MessageLog,
} from '../../types/database'

function formatWhen(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

export default function MessagesPage() {
  const [logs, setLogs] = useState<MessageLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cronMessage, setCronMessage] = useState<string | null>(null)
  const [cronLoading, setCronLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setLogs(await fetchMessageLogs(150))
    } catch (err) {
      setError(err instanceof Error ? err.message : '발송 이력을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleRunRenewalReminders() {
    setCronLoading(true)
    setCronMessage(null)
    try {
      const result = await triggerRenewalReminders()
      const processed =
        result && typeof result === 'object' && 'processed' in result
          ? Number((result as { processed: number }).processed)
          : 0
      setCronMessage(`갱신 안내 처리 완료 (${processed}건)`)
      await load()
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
        title="알림 발송"
        description="알림톡·문자 발송 이력을 확인합니다. 솔라피 연동 후 실제 발송됩니다."
      />

      <div className="rounded-xl border border-gold/30 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-charcoal">갱신 안내 (D-7, D-3, D-1)</h2>
        <p className="mt-1 text-sm text-muted">
          매일 오전 자동 실행은 Supabase Cron으로 설정하세요. 아래 버튼으로 수동
          실행할 수 있습니다.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleRunRenewalReminders()}
            disabled={cronLoading}
            className="rounded-lg bg-charcoal px-4 py-2 text-sm font-semibold text-cream transition hover:bg-charcoal-light disabled:opacity-50"
          >
            {cronLoading ? '실행 중…' : '갱신 안내 지금 실행'}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-gold/40 px-4 py-2 text-sm font-medium text-charcoal transition hover:bg-cream"
          >
            새로고침
          </button>
        </div>
        {cronMessage && (
          <p className="mt-2 text-sm text-muted">{cronMessage}</p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <p className="mt-1 text-xs">
            Supabase에서 migration_016_notifications.sql을 실행했는지 확인하세요.
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gold/30 bg-white">
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
            {loading ? (
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
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
