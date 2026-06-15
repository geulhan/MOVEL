import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  dismissPtReminderTargets,
  fetchPaymentTargets,
  fetchPtReminderPendingTargets,
  fetchRenewalTargets,
  fetchWelcomeTargets,
  formatPaymentSummary,
  formatPtReminderSummary,
  formatRenewalSummary,
  renewalReminderLabel,
  sendPaymentMessage,
  sendPtReminderMessage,
  sendRenewalMessage,
  sendWelcomeMessage,
  type MessageCampaignKind,
  type PaymentTarget,
  type PtReminderTarget,
  type RenewalTarget,
  type WelcomeTarget,
} from '../../api/messageCampaigns'
import { formatPhone } from '../../api/members'
import type { SendNotificationResult } from '../../api/notifications'
import { btnOutline, btnPrimary, cardClass } from '../../styles/theme'
import { MESSAGE_STATUS_LABELS } from '../../types/database'
import { filterBySearch } from '../../utils/renewal'

type Props = {
  kind: MessageCampaignKind
  onSent: () => void
}

type RowStatus = {
  status: SendNotificationResult['status']
  message?: string
}

const PANEL_COPY: Record<
  MessageCampaignKind,
  { title: string; description: string; empty: string }
> = {
  welcome: {
    title: '신규회원',
    description:
      '환영 알림톡을 아직 받지 않은 회원입니다. 회원 등록·자가가입 후 자동 발송되며, 여기서 수동 발송할 수 있습니다.',
    empty: '환영 알림 대상 회원이 없습니다.',
  },
  payment_done: {
    title: '결제안내',
    description:
      '최근 결제에 대한 결제 완료 알림톡을 아직 받지 않은 회원입니다.',
    empty: '결제 안내 대상 회원이 없습니다.',
  },
  renewal: {
    title: '재등록',
    description:
      '잔여 PT 5회 이하 또는 만료 7일 이내 회원 전체입니다. 발송 여부를 확인하고 수동 발송할 수 있습니다.',
    empty: '재등록 안내 대상 회원이 없습니다.',
  },
  pt_reminder: {
    title: 'PT D-1 리마인더',
    description:
      '수업 24시간 전 알림톡이 아직 발송되지 않은 예약입니다. 자동 발송 대상(24시간 전 ±1시간)과 그 이전에 누락된 예약이 표시됩니다.',
    empty: '발송 대기 중인 PT 리마인더가 없습니다.',
  },
}

function resultLabel(result: SendNotificationResult): string {
  if (result.status === 'sent') return MESSAGE_STATUS_LABELS.sent
  if (result.status === 'skipped') {
    return result.skippedReason === 'duplicate'
      ? '이미 발송됨'
      : (result.skippedReason ?? MESSAGE_STATUS_LABELS.skipped)
  }
  return result.error ?? MESSAGE_STATUS_LABELS.failed
}

export function MessageCampaignPanel({ kind, onSent }: Props) {
  const copy = PANEL_COPY[kind]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [welcomeRows, setWelcomeRows] = useState<WelcomeTarget[]>([])
  const [paymentRows, setPaymentRows] = useState<PaymentTarget[]>([])
  const [renewalRows, setRenewalRows] = useState<RenewalTarget[]>([])
  const [ptReminderRows, setPtReminderRows] = useState<PtReminderTarget[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({})
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkDismissing, setBulkDismissing] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (kind === 'welcome') {
        setWelcomeRows(await fetchWelcomeTargets())
      } else if (kind === 'payment_done') {
        setPaymentRows(await fetchPaymentTargets())
      } else if (kind === 'pt_reminder') {
        setPtReminderRows(await fetchPtReminderPendingTargets())
      } else {
        setRenewalRows(await fetchRenewalTargets())
      }
      setSelected(new Set())
      setRowStatus({})
    } catch (err) {
      setError(err instanceof Error ? err.message : '대상 회원을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [kind])

  useEffect(() => {
    void load()
  }, [load])

  const rowKeys = useMemo(() => {
    if (kind === 'welcome') return welcomeRows.map((row) => row.member.id)
    if (kind === 'payment_done') return paymentRows.map((row) => row.member.id)
    if (kind === 'renewal') return renewalRows.map((row) => row.member.id)
    if (kind === 'pt_reminder') {
      return ptReminderRows.map((row) => row.scheduleId)
    }
    return []
  }, [kind, welcomeRows, paymentRows, renewalRows, ptReminderRows])

  const filteredWelcome = useMemo(
    () =>
      filterBySearch(
        welcomeRows.map((row) => row.member),
        search,
      ).map((member) => ({ member })),
    [welcomeRows, search],
  )

  const filteredPayment = useMemo(() => {
    const ids = new Set(
      filterBySearch(
        paymentRows.map((row) => row.member),
        search,
      ).map((member) => member.id),
    )
    return paymentRows.filter((row) => ids.has(row.member.id))
  }, [paymentRows, search])

  const filteredRenewal = useMemo(() => {
    const ids = new Set(
      filterBySearch(
        renewalRows.map((row) => row.member),
        search,
      ).map((member) => member.id),
    )
    return renewalRows.filter((row) => ids.has(row.member.id))
  }, [renewalRows, search])

  const filteredPtReminder = useMemo(() => {
    const ids = new Set(
      filterBySearch(
        ptReminderRows.map((row) => row.member),
        search,
      ).map((member) => member.id),
    )
    return ptReminderRows.filter((row) => ids.has(row.member.id))
  }, [ptReminderRows, search])

  const visibleIds = useMemo(() => {
    if (kind === 'welcome') return filteredWelcome.map((row) => row.member.id)
    if (kind === 'payment_done') return filteredPayment.map((row) => row.member.id)
    if (kind === 'renewal') return filteredRenewal.map((row) => row.member.id)
    if (kind === 'pt_reminder') {
      return filteredPtReminder.map((row) => row.scheduleId)
    }
    return []
  }, [kind, filteredWelcome, filteredPayment, filteredRenewal, filteredPtReminder])

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id)
      } else {
        for (const id of visibleIds) next.add(id)
      }
      return next
    })
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function sendOne(rowKey: string): Promise<SendNotificationResult> {
    if (kind === 'welcome') {
      return sendWelcomeMessage(rowKey)
    }
    if (kind === 'payment_done') {
      const row = paymentRows.find((item) => item.member.id === rowKey)
      if (!row) throw new Error('결제 정보를 찾을 수 없습니다.')
      return sendPaymentMessage(rowKey, row.payment.id)
    }
    if (kind === 'pt_reminder') {
      const row = ptReminderRows.find((item) => item.scheduleId === rowKey)
      if (!row) throw new Error('예약 정보를 찾을 수 없습니다.')
      return sendPtReminderMessage(row)
    }
    const row = renewalRows.find((item) => item.member.id === rowKey)
    if (!row) throw new Error('회원 정보를 찾을 수 없습니다.')
    return sendRenewalMessage(rowKey, row.notifyTier)
  }

  async function handleSendOne(rowKey: string) {
    setSendingId(rowKey)
    setError(null)
    try {
      const result = await sendOne(rowKey)
      setRowStatus((prev) => ({
        ...prev,
        [rowKey]: {
          status: result.status,
          message: resultLabel(result),
        },
      }))
      if (result.status === 'sent') {
        onSent()
        await load()
      }
    } catch (err) {
      setRowStatus((prev) => ({
        ...prev,
        [rowKey]: {
          status: 'failed',
          message: err instanceof Error ? err.message : '발송 실패',
        },
      }))
    } finally {
      setSendingId(null)
    }
  }

  async function handleBulkSend() {
    const ids = rowKeys.filter((id) => selected.has(id))
    if (ids.length === 0) {
      setError('발송할 회원을 선택해 주세요.')
      return
    }
    if (!window.confirm(`선택한 ${ids.length}명에게 알림톡을 발송할까요?`)) {
      return
    }

    setBulkSending(true)
    setError(null)
    let sent = 0
    let failed = 0

    for (const rowKey of ids) {
      try {
        const result = await sendOne(rowKey)
        setRowStatus((prev) => ({
          ...prev,
          [rowKey]: {
            status: result.status,
            message: resultLabel(result),
          },
        }))
        if (result.status === 'sent') sent += 1
        else failed += 1
      } catch (err) {
        failed += 1
        setRowStatus((prev) => ({
          ...prev,
          [rowKey]: {
            status: 'failed',
            message: err instanceof Error ? err.message : '발송 실패',
          },
        }))
      }
    }

    setBulkSending(false)
    onSent()
    await load()
    setError(
      failed > 0
        ? `발송 완료 ${sent}건, 실패·생략 ${failed}건`
        : null,
    )
  }

  async function handleBulkDismiss() {
    if (kind !== 'pt_reminder') return

    const ids = rowKeys.filter((id) => selected.has(id))
    if (ids.length === 0) {
      setError('제외할 예약을 선택해 주세요.')
      return
    }
    if (
      !window.confirm(
        `선택한 ${ids.length}건을 PT 리마인더 목록에서 제외할까요?\n(알림톡은 발송되지 않습니다.)`,
      )
    ) {
      return
    }

    const targets = ptReminderRows.filter((row) => ids.includes(row.scheduleId))
    setBulkDismissing(true)
    setError(null)
    try {
      await dismissPtReminderTargets(targets)
      onSent()
      await load()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '목록에서 제외하지 못했습니다.',
      )
    } finally {
      setBulkDismissing(false)
    }
  }

  const count =
    kind === 'welcome'
      ? filteredWelcome.length
      : kind === 'payment_done'
        ? filteredPayment.length
        : kind === 'renewal'
          ? filteredRenewal.length
          : kind === 'pt_reminder'
            ? filteredPtReminder.length
            : 0

  return (
    <div className="space-y-4">
      <div className={`${cardClass} card-pad`}>
        <h3 className="text-base font-semibold text-charcoal">{copy.title}</h3>
        <p className="mt-1 text-sm text-muted">{copy.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름·전화·트레이너 검색"
            className="input-field min-w-[200px] flex-1"
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || bulkSending || bulkDismissing}
            className={btnOutline}
          >
            새로고침
          </button>
          {kind === 'pt_reminder' && (
            <button
              type="button"
              onClick={() => void handleBulkDismiss()}
              disabled={
                loading || bulkSending || bulkDismissing || selected.size === 0
              }
              className={btnOutline}
            >
              {bulkDismissing
                ? '제외 중…'
                : `회원 선택 삭제 (${selected.size})`}
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleBulkSend()}
            disabled={
              loading || bulkSending || bulkDismissing || selected.size === 0
            }
            className={btnPrimary}
          >
            {bulkSending ? '발송 중…' : `선택 발송 (${selected.size})`}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">대상 {count}명</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gold/30 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gold/20 bg-cream/60 text-left text-xs text-muted">
              <th className="px-4 py-3 font-semibold">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  disabled={loading || visibleIds.length === 0}
                  aria-label="현재 목록 전체 선택"
                />
              </th>
              <th className="px-4 py-3 font-semibold">회원</th>
              <th className="px-4 py-3 font-semibold">연락처</th>
              <th className="px-4 py-3 font-semibold">안내 정보</th>
              <th className="px-4 py-3 font-semibold">결과</th>
              <th className="px-4 py-3 font-semibold">발송</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  불러오는 중…
                </td>
              </tr>
            ) : count === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  {copy.empty}
                </td>
              </tr>
            ) : kind === 'welcome' ? (
              filteredWelcome.map(({ member }) => (
                <CampaignRow
                  key={member.id}
                  memberId={member.id}
                  name={member.name}
                  phone={member.phone}
                  detail={`등록 ${member.registered_at.split('T')[0]}`}
                  selected={selected.has(member.id)}
                  onToggle={() => toggleOne(member.id)}
                  rowStatus={rowStatus[member.id]}
                  sending={sendingId === member.id}
                  onSend={() => void handleSendOne(member.id)}
                />
              ))
            ) : kind === 'payment_done' ? (
              filteredPayment.map(({ member, payment }) => (
                <CampaignRow
                  key={member.id}
                  memberId={member.id}
                  name={member.name}
                  phone={member.phone}
                  detail={formatPaymentSummary(payment)}
                  selected={selected.has(member.id)}
                  onToggle={() => toggleOne(member.id)}
                  rowStatus={rowStatus[member.id]}
                  sending={sendingId === member.id}
                  onSend={() => void handleSendOne(member.id)}
                />
              ))
            ) : kind === 'renewal' ? (
              filteredRenewal.map(({ member, daysLeft, notifyTier, alreadySent }) => (
                <CampaignRow
                  key={member.id}
                  memberId={member.id}
                  name={member.name}
                  phone={member.phone}
                  detail={`${formatRenewalSummary(member, daysLeft)} · 발송 구간 ${renewalReminderLabel(notifyTier)}`}
                  badge={alreadySent ? '발송 완료' : renewalReminderLabel(notifyTier)}
                  badgeTone={alreadySent ? 'muted' : 'alert'}
                  selected={selected.has(member.id)}
                  onToggle={() => toggleOne(member.id)}
                  rowStatus={rowStatus[member.id]}
                  sending={sendingId === member.id}
                  onSend={() => void handleSendOne(member.id)}
                  sendDisabled={alreadySent}
                />
              ))
            ) : kind === 'pt_reminder' ? (
              filteredPtReminder.map((row) => (
                <CampaignRow
                  key={row.scheduleId}
                  memberId={row.member.id}
                  name={row.member.name}
                  phone={row.member.phone}
                  detail={formatPtReminderSummary(row)}
                  badge="미발송"
                  selected={selected.has(row.scheduleId)}
                  onToggle={() => toggleOne(row.scheduleId)}
                  rowStatus={rowStatus[row.scheduleId]}
                  sending={sendingId === row.scheduleId}
                  onSend={() => void handleSendOne(row.scheduleId)}
                />
              ))
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CampaignRow({
  memberId,
  name,
  phone,
  detail,
  badge,
  badgeTone = 'alert',
  selected,
  onToggle,
  rowStatus,
  sending,
  onSend,
  sendDisabled = false,
}: {
  memberId: string
  name: string
  phone: string
  detail: string
  badge?: string
  badgeTone?: 'alert' | 'muted'
  selected: boolean
  onToggle: () => void
  rowStatus?: RowStatus
  sending: boolean
  onSend: () => void
  sendDisabled?: boolean
}) {
  return (
    <tr className="border-b border-gold/10">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`${name} 선택`}
        />
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <Link
          to={`/admin/member/${memberId}`}
          className="font-medium text-charcoal underline-offset-2 hover:underline"
        >
          {name}
        </Link>
        {badge && (
          <span
            className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              badgeTone === 'muted'
                ? 'bg-gray-100 text-gray-600'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {badge}
          </span>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
        {formatPhone(phone)}
      </td>
      <td className="px-4 py-3 text-xs text-muted">{detail}</td>
      <td className="px-4 py-3 text-xs">
        {rowStatus ? (
          <span
            className={
              rowStatus.status === 'sent'
                ? 'text-emerald-700'
                : rowStatus.status === 'failed'
                  ? 'text-red-700'
                  : 'text-amber-700'
            }
          >
            {rowStatus.message}
          </span>
        ) : (
          '-'
        )}
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={onSend}
          disabled={sending || sendDisabled}
          className="rounded-lg border border-gold/40 px-3 py-1.5 text-xs font-semibold text-charcoal transition hover:bg-cream disabled:opacity-50"
        >
          {sendDisabled ? '발송됨' : sending ? '발송 중…' : '발송'}
        </button>
      </td>
    </tr>
  )
}
