import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  fetchMemberById,
  fetchPaymentHistory,
} from '../api/memberDetail'
import {
  attendanceMethodLabel,
  fetchMemberAttendance,
  type MemberAttendanceRow,
} from '../api/attendance'
import {
  formatCurrency,
  formatDate,
  formatPhone,
  isExpired,
  updateMemberRemainingSessions,
} from '../api/members'
import { updatePayment } from '../api/payments'
import {
  extendMemberPeriod,
  fetchPeriodExtensions,
} from '../api/period'
import { SESSION_DAYS_PER_SESSION } from '../constants/session'
import type { Member, PaymentHistory, PeriodExtension } from '../types/database'
import {
  btnInlineCancel,
  btnInlineSave,
  btnLink,
  btnLinkSm,
  btnNavBack,
  btnOutline,
  btnPrimary,
  cardClass,
  inputClass,
} from '../styles/theme'
import { MEMBER_STATUS_LABELS } from '../types/database'
import { getRemainingSessionsClass } from '../utils/sessions'
import { MemberAdminMemosSection } from './MemberAdminMemosSection'
import { MemberExerciseJournalSection } from './MemberExerciseJournalSection'
import { MemberConsultationTimeline } from './MemberConsultationTimeline'
import { PtAlertBadge } from './PtAlertBadge'
import { StatusBadge } from './StatusBadge'

type Props = {
  memberId: string
  onBack: () => void
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ProfileField({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="min-w-0 rounded-xl bg-cream/60 px-3 py-2.5">
      <dt className="text-xs font-medium text-charcoal/50">{label}</dt>
      <dd
        className={`mt-0.5 truncate text-sm font-semibold ${
          highlight ? 'text-red-600' : 'text-charcoal'
        }`}
        title={value}
      >
        {value}
      </dd>
    </div>
  )
}

function PtUsageBar({ used, total }: { used: number; total: number }) {
  const rate = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-charcoal/60">PT 사용률</span>
        <span className="font-bold text-charcoal tabular-nums">{rate}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-cream">
        <div
          className="h-full rounded-full bg-gold transition-all"
          style={{ width: `${rate}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted tabular-nums">
        사용 {used}회 / 등록 {total}회
      </p>
    </div>
  )
}

export function MemberDetailPage({ memberId, onBack }: Props) {
  const [member, setMember] = useState<Member | null>(null)
  const [payments, setPayments] = useState<PaymentHistory[]>([])
  const [attendance, setAttendance] = useState<MemberAttendanceRow[]>([])
  const [periodExtensions, setPeriodExtensions] = useState<PeriodExtension[]>(
    [],
  )
  const [showPeriod, setShowPeriod] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [editPaidAt, setEditPaidAt] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [savingPaymentId, setSavingPaymentId] = useState<string | null>(null)
  const [extendDays, setExtendDays] = useState('7')
  const [extendNote, setExtendNote] = useState('')
  const [extendSaving, setExtendSaving] = useState(false)
  const [editingRemaining, setEditingRemaining] = useState(false)
  const [editRemaining, setEditRemaining] = useState('')
  const [savingRemaining, setSavingRemaining] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const m = await fetchMemberById(memberId)
      const [p, att, ext] = await Promise.all([
        fetchPaymentHistory(memberId),
        fetchMemberAttendance(memberId, m.trainer_name),
        fetchPeriodExtensions(memberId),
      ])
      setMember(m)
      setPayments(p)
      setAttendance(att)
      setPeriodExtensions(ext)
    } catch (err) {
      setError(err instanceof Error ? err.message : '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void load()
  }, [load])

  const usedSessions = useMemo(() => {
    if (!member) return 0
    return Math.max(0, member.total_sessions - member.remaining_sessions)
  }, [member])

  const expired =
    member?.expires_at != null && isExpired(member.expires_at)

  async function handlePaymentSave(paymentId: string) {
    setSavingPaymentId(paymentId)
    setError(null)
    try {
      await updatePayment(paymentId, memberId, {
        paid_at: editPaidAt,
        amount: Number(editAmount),
      })
      setEditingPaymentId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '결제 수정 실패')
    } finally {
      setSavingPaymentId(null)
    }
  }

  function startEditRemaining() {
    if (!member) return
    setEditRemaining(String(member.remaining_sessions))
    setEditingRemaining(true)
  }

  function cancelEditRemaining() {
    setEditingRemaining(false)
    setEditRemaining('')
  }

  async function handleRemainingSave() {
    const value = Number(editRemaining)
    if (!Number.isInteger(value) || value < 0) {
      setError('잔여 횟수는 0 이상의 정수여야 합니다.')
      return
    }
    if (member && value > member.total_sessions) {
      setError(`잔여 횟수는 등록 횟수(${member.total_sessions}회)를 초과할 수 없습니다.`)
      return
    }
    setSavingRemaining(true)
    setError(null)
    try {
      await updateMemberRemainingSessions(memberId, value)
      setEditingRemaining(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '잔여 횟수 수정 실패')
    } finally {
      setSavingRemaining(false)
    }
  }

  async function handleExtendSubmit(e: FormEvent) {
    e.preventDefault()
    if (!member) return
    const days = Number(extendDays)
    if (!Number.isInteger(days) || days < 1) {
      setError('연장 일수를 올바르게 입력해 주세요.')
      return
    }
    setExtendSaving(true)
    setError(null)
    try {
      await extendMemberPeriod(member, days, extendNote)
      setExtendNote('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '기간 연장 실패')
    } finally {
      setExtendSaving(false)
    }
  }

  if (loading && !member) {
    return (
      <p className="py-16 text-center text-sm text-muted">불러오는 중…</p>
    )
  }

  if (!member) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">
          {error ?? '회원을 찾을 수 없습니다.'}
        </p>
        <button
          type="button"
          onClick={onBack}
          className={btnLinkSm}
        >
          ← 목록으로
        </button>
      </div>
    )
  }

  const remainingClass = getRemainingSessionsClass(member.remaining_sessions)

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className={btnNavBack}
      >
        ← 회원 목록
      </button>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 1. 기본 정보 */}
      <section className={`${cardClass} card-pad`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-2xl font-bold text-charcoal">
              {member.name}
            </h2>
            <PtAlertBadge member={member} />
          </div>
          <StatusBadge status={member.status} />
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <ProfileField label="전화번호" value={formatPhone(member.phone)} />
          <ProfileField
            label="담당 트레이너"
            value={member.trainer_name ?? '미지정'}
          />
          <ProfileField
            label="상태"
            value={MEMBER_STATUS_LABELS[member.status]}
          />
          <ProfileField
            label="등록일"
            value={formatDate(member.registered_at)}
          />
          <ProfileField
            label="만료일"
            value={formatDate(member.expires_at)}
            highlight={expired}
          />
          <ProfileField
            label="총 결제"
            value={formatCurrency(Number(member.payment_amount))}
          />
        </dl>
      </section>

      {/* 2. PT 정보 */}
      <section className={`${cardClass} card-pad`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-charcoal">PT 정보</h3>
          {!editingRemaining && (
            <button
              type="button"
              onClick={startEditRemaining}
              className={btnLink}
            >
              잔여 횟수 수정
            </button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-cream/70 px-3 py-3 text-center">
            <p className="text-xs text-charcoal/50">등록</p>
            <p className="mt-1 text-2xl font-bold text-charcoal tabular-nums">
              {member.total_sessions}
            </p>
          </div>
          <div className="rounded-xl bg-cream/70 px-3 py-3 text-center">
            <p className="text-xs text-charcoal/50">사용</p>
            <p className="mt-1 text-2xl font-bold text-charcoal tabular-nums">
              {usedSessions}
            </p>
          </div>
          <div className="rounded-xl bg-cream/70 px-3 py-3 text-center">
            <p className="text-xs text-charcoal/50">잔여</p>
            {editingRemaining ? (
              <input
                type="number"
                min={0}
                max={member.total_sessions}
                value={editRemaining}
                onChange={(e) => setEditRemaining(e.target.value)}
                className={`${inputClass} mt-1 !py-1.5 text-center text-lg font-bold`}
              />
            ) : (
              <p
                className={`mt-1 text-2xl font-bold tabular-nums ${remainingClass}`}
              >
                {member.remaining_sessions}
              </p>
            )}
          </div>
        </div>
        {editingRemaining && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={savingRemaining}
              onClick={() => void handleRemainingSave()}
              className={btnPrimary}
            >
              {savingRemaining ? '저장 중…' : '저장'}
            </button>
            <button
              type="button"
              onClick={cancelEditRemaining}
              className={btnOutline}
            >
              취소
            </button>
            <p className="w-full text-xs text-muted">
              만료일은 변경되지 않습니다. (0 ~ {member.total_sessions}회)
            </p>
          </div>
        )}
        <PtUsageBar used={usedSessions} total={member.total_sessions} />
      </section>

      {/* 3. 결제 내역 */}
      <section className={`${cardClass} overflow-hidden`}>
        <div className="card-header">
          <h3 className="text-base font-semibold text-charcoal">결제 내역</h3>
          <p className="mt-0.5 text-xs text-muted">최신순 · 수정 가능</p>
        </div>
        {payments.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted">
            결제 내역이 없습니다.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-2.5">결제일</th>
                  <th className="px-4 py-2.5">결제금액</th>
                  <th className="px-4 py-2.5">등록 횟수</th>
                  <th className="px-4 py-2.5">수정</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/15">
                {payments.map((p) => {
                  const editing = editingPaymentId === p.id
                  return (
                    <tr key={p.id} className="hover:bg-cream/40">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {editing ? (
                          <input
                            type="date"
                            value={editPaidAt}
                            onChange={(e) => setEditPaidAt(e.target.value)}
                            className={`${inputClass} !py-1.5 text-xs`}
                          />
                        ) : (
                          formatDate(p.paid_at)
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {editing ? (
                          <input
                            type="number"
                            min={0}
                            step={1000}
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className={`${inputClass} !w-28 !py-1.5 text-xs`}
                          />
                        ) : (
                          <span className="font-medium tabular-nums">
                            {formatCurrency(Number(p.amount))}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {p.sessions}회
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {editing ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={savingPaymentId === p.id}
                              onClick={() => void handlePaymentSave(p.id)}
                              className={btnInlineSave}
                            >
                              {savingPaymentId === p.id ? '…' : '저장'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPaymentId(null)}
                              className={btnInlineCancel}
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPaymentId(p.id)
                              setEditPaidAt(String(p.paid_at).slice(0, 10))
                              setEditAmount(String(p.amount))
                            }}
                            className={btnLink}
                          >
                            수정
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 4. 출석 내역 */}
      <section className={`${cardClass} overflow-hidden`}>
        <div className="card-header">
          <h3 className="text-base font-semibold text-charcoal">출석 내역</h3>
          <p className="mt-0.5 text-xs text-muted">출석 시 PT 1회 차감</p>
        </div>
        {attendance.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted">
            출석 기록이 없습니다.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-2.5">출석일</th>
                  <th className="px-4 py-2.5">담당 트레이너</th>
                  <th className="px-4 py-2.5">차감</th>
                  <th className="px-4 py-2.5">방식</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/15">
                {attendance.map((a) => (
                  <tr key={a.id} className="hover:bg-cream/40">
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatDateTime(a.checked_in_at)}
                    </td>
                    <td className="max-w-[8rem] truncate px-4 py-3">
                      {a.trainer_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {a.deducted ? (
                        <span className="text-xs font-semibold text-charcoal">
                          1회 차감
                        </span>
                      ) : (
                        <span className="text-xs text-charcoal/40">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-charcoal/60">
                      {attendanceMethodLabel(a.method)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. 관리자 메모 */}
      <MemberAdminMemosSection memberId={memberId} />

      {/* 상담기록 · 운동일지 */}
      <MemberConsultationTimeline memberId={memberId} />
      <MemberExerciseJournalSection memberId={memberId} />

      {/* 기간 연장 (접이식) */}
      <section className={`${cardClass} overflow-hidden`}>
        <button
          type="button"
          onClick={() => setShowPeriod((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left sm:px-6"
        >
          <div>
            <h3 className="text-sm font-semibold text-charcoal">기간 연장</h3>
            <p className="mt-0.5 text-xs text-muted">
              1세션 = {SESSION_DAYS_PER_SESSION}일 · 별도 연장
            </p>
          </div>
          <span className="text-charcoal/40">{showPeriod ? '▲' : '▼'}</span>
        </button>
        {showPeriod && (
          <div className="border-t border-gold/15 px-5 py-4 sm:px-6">
            <form
              onSubmit={(e) => void handleExtendSubmit(e)}
              className="grid gap-3 sm:grid-cols-[120px_1fr_auto]"
            >
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-medium text-charcoal/70">
                  연장 일수
                </span>
                <input
                  type="number"
                  min={1}
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-medium text-charcoal/70">
                  사유
                </span>
                <input
                  type="text"
                  lang="ko"
                  value={extendNote}
                  onChange={(e) => setExtendNote(e.target.value)}
                  className={inputClass}
                />
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={extendSaving}
                  className={btnPrimary}
                >
                  {extendSaving ? '처리 중…' : '연장'}
                </button>
              </div>
            </form>
            {periodExtensions.length > 0 && (
              <ul className="mt-4 divide-y divide-gold/15 border-t border-gold/15 pt-2 text-sm">
                {periodExtensions.map((ext) => (
                  <li
                    key={ext.id}
                    className="flex justify-between gap-2 py-2"
                  >
                    <span className="font-medium">+{ext.days_added}일</span>
                    <span className="text-xs text-charcoal/40 tabular-nums">
                      {formatDateTime(ext.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
