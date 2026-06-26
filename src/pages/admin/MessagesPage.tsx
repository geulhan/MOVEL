import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchMessageLogs,
  triggerNotificationCron,
  triggerPtReminders,
  triggerRenewalReminders,
  triggerScheduleReminders,
} from '../../api/notifications'
import { MessageCampaignPanel } from '../../components/admin/MessageCampaignPanel'
import { MessagingCreditPanel } from '../../components/admin/MessagingCreditPanel'
import { PageHeader } from '../../components/admin/PageHeader'
import { MotionHubSupportLink } from '../../components/admin/MotionHubSupportLink'
import type { MessageCampaignKind } from '../../api/messageCampaigns'
import {
  MESSAGE_STATUS_LABELS,
  MESSAGE_TEMPLATE_LABELS,
  type MessageLog,
  type MessageLogStatus,
} from '../../types/database'

const SEND_TABS: Array<{ id: MessageCampaignKind; label: string }> = [
  { id: 'welcome', label: '회원가입 안내' },
  { id: 'payment_done', label: '결제 완료' },
  { id: 'renewal', label: '재등록' },
  { id: 'pt_reminder', label: '수업 리마인더' },
]

const STATUS_FILTERS: Array<{
  id: MessageLogStatus | 'all'
  label: string
}> = [
  { id: 'all', label: '전체' },
  { id: 'sent', label: '발송 성공' },
  { id: 'failed', label: '발송 실패' },
  { id: 'pending', label: '발송 대기' },
  { id: 'skipped', label: '발송 생략' },
]

function formatWhen(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<MessageCampaignKind>('welcome')
  const [statusFilter, setStatusFilter] = useState<MessageLogStatus | 'all'>(
    'all',
  )
  const [logs, setLogs] = useState<MessageLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [cronMessage, setCronMessage] = useState<string | null>(null)
  const [renewalCronLoading, setRenewalCronLoading] = useState(false)
  const [scheduleCronLoading, setScheduleCronLoading] = useState(false)
  const [ptCronLoading, setPtCronLoading] = useState(false)
  const [autoCronLoading, setAutoCronLoading] = useState(false)

  const loadLogs = useCallback(async () => {
    setLogsLoading(true)
    setLogsError(null)
    try {
      setLogs(await fetchMessageLogs(200, statusFilter))
    } catch (err) {
      setLogsError(
        err instanceof Error ? err.message : '발송 이력을 불러올 수 없습니다.',
      )
    } finally {
      setLogsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  const filteredLogCount = useMemo(() => logs.length, [logs])

  async function handleRunScheduleReminders() {
    setScheduleCronLoading(true)
    setCronMessage(null)
    try {
      const result = await triggerScheduleReminders()
      const processed =
        result && typeof result === 'object' && 'processed' in result
          ? Number((result as { processed: number }).processed)
          : 0
      setCronMessage(`수업 리마인더(24시간 전) 실행 완료 (${processed}건)`)
      await loadLogs()
    } catch (err) {
      setCronMessage(
        err instanceof Error
          ? err.message
          : '수업 리마인더 실행에 실패했습니다.',
      )
    } finally {
      setScheduleCronLoading(false)
    }
  }

  async function handleRunPtReminders() {
    setPtCronLoading(true)
    setCronMessage(null)
    try {
      const result = await triggerPtReminders()
      const processed =
        result && typeof result === 'object' && 'processed' in result
          ? Number((result as { processed: number }).processed)
          : 0
      setCronMessage(
        `PT 잔여횟수 알림 실행 완료 (${processed}건)`,
      )
      await loadLogs()
    } catch (err) {
      setCronMessage(
        err instanceof Error
          ? err.message
          : 'PT 잔여횟수 알림 실행에 실패했습니다.',
      )
    } finally {
      setPtCronLoading(false)
    }
  }

  async function handleRunAutoCron() {
    setAutoCronLoading(true)
    setCronMessage(null)
    try {
      const result = await triggerNotificationCron()
      const total =
        result && typeof result === 'object' && 'totalProcessed' in result
          ? Number((result as { totalProcessed: number }).totalProcessed)
          : 0
      setCronMessage(
        `자동발송 일괄 실행 완료 (PT 잔여 + 수업 리마인더, ${total}건 처리)`,
      )
      await loadLogs()
    } catch (err) {
      setCronMessage(
        err instanceof Error ? err.message : '자동발송 실행에 실패했습니다.',
      )
    } finally {
      setAutoCronLoading(false)
    }
  }

  async function handleRunRenewalReminders() {
    setRenewalCronLoading(true)
    setCronMessage(null)
    try {
      const result = await triggerRenewalReminders()
      const processed =
        result && typeof result === 'object' && 'processed' in result
          ? Number((result as { processed: number }).processed)
          : 0
      setCronMessage(`회원권 만료 안내 일괄 실행 완료 (${processed}건)`)
      await loadLogs()
    } catch (err) {
      setCronMessage(
        err instanceof Error
          ? err.message
          : '회원권 만료 안내 실행에 실패했습니다.',
      )
    } finally {
      setRenewalCronLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="메시지 발송"
        description="회원 유형별로 알림톡을 확인하고 수동 발송할 수 있습니다. 발송 이력에서 성공·실패·대기·생략 상태를 조회할 수 있습니다."
      />

      <MessagingCreditPanel onUpdated={() => void loadLogs()} />

      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <span className="font-medium">자동발송</span> — PT 잔여 3·1회, 수업
        24시간 이내 리마인더는 <strong>매시 정각</strong>에 자동 실행됩니다
        (발송 이력 없으면 보완 발송). PT 차감 시 잔여 3·1회면 즉시 발송을
        시도합니다.
      </p>

      <p className="text-sm text-muted">
        알림톡 채널·템플릿 심사 문의: <MotionHubSupportLink />
      </p>

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
              최근 알림톡·문자 발송 기록입니다. ({filteredLogCount}건)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleRunAutoCron()}
              disabled={autoCronLoading}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              {autoCronLoading ? '실행 중…' : '자동발송 지금 실행'}
            </button>
            <button
              type="button"
              onClick={() => void handleRunScheduleReminders()}
              disabled={scheduleCronLoading}
              className="rounded-lg border border-gold/40 px-4 py-2 text-sm font-medium text-charcoal transition hover:bg-cream disabled:opacity-50"
            >
              {scheduleCronLoading ? '실행 중…' : '수업 리마인더 실행'}
            </button>
            <button
              type="button"
              onClick={() => void handleRunRenewalReminders()}
              disabled={renewalCronLoading}
              className="rounded-lg border border-gold/40 px-4 py-2 text-sm font-medium text-charcoal transition hover:bg-cream disabled:opacity-50"
            >
              {renewalCronLoading ? '실행 중…' : '회원권 만료 안내 실행'}
            </button>
            <button
              type="button"
              onClick={() => void handleRunPtReminders()}
              disabled={ptCronLoading}
              className="rounded-lg border border-gold/40 px-4 py-2 text-sm font-medium text-charcoal transition hover:bg-cream disabled:opacity-50"
            >
              {ptCronLoading ? '실행 중…' : 'PT 잔여횟수만 실행'}
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

        <nav className="chip-scroll -mx-1 px-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={`chip ${
                statusFilter === filter.id ? 'chip-active' : 'chip-inactive'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </nav>

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
                      {MESSAGE_TEMPLATE_LABELS[log.template_key] ??
                        log.template_key}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                      {log.phone}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-muted">
                      {[
                        log.channel === 'sms'
                          ? '문자'
                          : log.channel === 'alimtalk'
                            ? '알림톡'
                            : null,
                        log.error_message ?? log.provider_message_id,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '-'}
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
        : status === 'pending'
          ? 'bg-blue-100 text-blue-800'
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
