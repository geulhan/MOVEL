import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchPaymentTargets,
  fetchRenewalTargets,
  fetchWelcomeTargets,
  formatPaymentSummary,
  formatRenewalSummary,
  renewalReminderLabel,
  sendPaymentMessage,
  sendRenewalMessage,
  sendWelcomeMessage,
  suggestRenewalDaysLeft,
  type MessageCampaignKind,
  type PaymentTarget,
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
      '잔여 PT 5회 이하 또는 만료 7일 이내 회원입니다. 갱신 안내 알림톡을 보낼 수 있습니다.',
    empty: '재등록 안내 대상 회원이 없습니다.',
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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({})
  const [bulkSending, setBulkSending] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (kind === 'welcome') {
        setWelcomeRows(await fetchWelcomeTargets())
      } else if (kind === 'payment_done') {
        setPaymentRows(await fetchPaymentTargets())
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

  const memberIds = useMemo(() => {
    if (kind === 'welcome') return welcomeRows.map((row) => row.member.id)
    if (kind === 'payment_done') return paymentRows.map((row) => row.member.id)
    return renewalRows.map((row) => row.member.id)
  }, [kind, welcomeRows, paymentRows, renewalRows])

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

  const visibleIds = useMemo(() => {
    if (kind === 'welcome') return filteredWelcome.map((row) => row.member.id)
    if (kind === 'payment_done') return filteredPayment.map((row) => row.member.id)
    return filteredRenewal.map((row) => row.member.id)
  }, [kind, filteredWelcome, filteredPayment, filteredRenewal])

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

  async function sendOne(memberId: string): Promise<SendNotificationResult> {
    if (kind === 'welcome') {
      return sendWelcomeMessage(memberId)
    }
    if (kind === 'payment_done') {
      const row = paymentRows.find((item) => item.member.id === memberId)
      if (!row) throw new Error('결제 정보를 찾을 수 없습니다.')
      return sendPaymentMessage(memberId, row.payment.id)
    }
    const row = renewalRows.find((item) => item.member.id === memberId)
    if (!row) throw new Error('회원 정보를 찾을 수 없습니다.')
    const daysLeft = suggestRenewalDaysLeft(row.daysLeft)
    return sendRenewalMessage(memberId, daysLeft)
  }

  async function handleSendOne(memberId: string) {
    setSendingId(memberId)
    setError(null)
    try {
      const result = await sendOne(memberId)
      setRowStatus((prev) => ({
        ...prev,
        [memberId]: {
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
        [memberId]: {
          status: 'failed',
          message: err instanceof Error ? err.message : '발송 실패',
        },
      }))
    } finally {
      setSendingId(null)
    }
  }

  async function handleBulkSend() {
    const ids = memberIds.filter((id) => selected.has(id))
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

    for (const memberId of ids) {
      try {
        const result = await sendOne(memberId)
        setRowStatus((prev) => ({
          ...prev,
          [memberId]: {
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
          [memberId]: {
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

  const count =
    kind === 'welcome'
      ? filteredWelcome.length
      : kind === 'payment_done'
        ? filteredPayment.length
        : filteredRenewal.length

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
            disabled={loading || bulkSending}
            className={btnOutline}
          >
            새로고침
          </button>
          <button
            type="button"
            onClick={() => void handleBulkSend()}
            disabled={loading || bulkSending || selected.size === 0}
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
            ) : (
              filteredRenewal.map(({ member, daysLeft }) => (
                <CampaignRow
                  key={member.id}
                  memberId={member.id}
                  name={member.name}
                  phone={member.phone}
                  detail={formatRenewalSummary(member, daysLeft)}
                  badge={renewalReminderLabel(daysLeft)}
                  selected={selected.has(member.id)}
                  onToggle={() => toggleOne(member.id)}
                  rowStatus={rowStatus[member.id]}
                  sending={sendingId === member.id}
                  onSend={() => void handleSendOne(member.id)}
                />
              ))
            )}
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
  selected,
  onToggle,
  rowStatus,
  sending,
  onSend,
}: {
  memberId: string
  name: string
  phone: string
  detail: string
  badge?: string
  selected: boolean
  onToggle: () => void
  rowStatus?: RowStatus
  sending: boolean
  onSend: () => void
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
          <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
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
          disabled={sending}
          className="rounded-lg border border-gold/40 px-3 py-1.5 text-xs font-semibold text-charcoal transition hover:bg-cream disabled:opacity-50"
        >
          {sending ? '발송 중…' : '발송'}
        </button>
      </td>
    </tr>
  )
}
