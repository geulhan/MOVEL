import { useCallback, useEffect, useState } from 'react'
import {
  CLASS_TYPE_LABELS,
  RESERVATION_STATUS_LABELS,
  canMemberCancelReservation,
  cancelClassReservation,
  classRequiresSessionPass,
  fetchMemberClassSchedules,
  reserveClassForMember,
  type ReservationStatus,
} from '../../api/classes'
import { todayDateString } from '../../api/members'
import {
  canMemberBookWithPasses,
  fetchMemberActiveSessionPasses,
  sessionPassLabel,
  type MemberSessionPassSummary,
} from '../../api/memberSessionPasses'
import { supabase } from '../../lib/supabase'
import { btnOutline, btnPrimary, cardClass } from '../../styles/theme'

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function formatScheduleLabel(startsAt: string): string {
  const d = new Date(startsAt)
  return d.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type Props = {
  memberId: string
}

export function MemberClassBookingSection({ memberId }: Props) {
  const [schedules, setSchedules] = useState<
    Awaited<ReturnType<typeof fetchMemberClassSchedules>>
  >([])
  const [passes, setPasses] = useState<MemberSessionPassSummary[]>([])
  const [ptRemaining, setPtRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const start = todayDateString()
      const end = addDays(start, 14)
      const [rows, passRows, memberRes] = await Promise.all([
        fetchMemberClassSchedules(memberId, `${start}T00:00:00`, `${end}T23:59:59`),
        fetchMemberActiveSessionPasses(memberId),
        supabase.from('members').select('remaining_sessions').eq('id', memberId).single(),
      ])
      if (memberRes.error) throw memberRes.error
      setSchedules(rows.filter((s) => new Date(s.starts_at) > new Date()))
      setPasses(passRows)
      setPtRemaining(Number(memberRes.data?.remaining_sessions ?? 0))
    } catch (err) {
      setError(err instanceof Error ? err.message : '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleReserve(scheduleId: string) {
    setMessage(null)
    try {
      await reserveClassForMember({ scheduleId, memberId, asMember: true })
      setMessage('예약이 완료되었습니다.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '예약 실패')
    }
  }

  async function handleCancel(
    reservationId: string,
    startsAt: string,
    status: ReservationStatus | undefined,
  ) {
    if (!reservationId || status === 'attended' || status === 'noshow') return
    setMessage(null)
    try {
      await cancelClassReservation({
        reservationId,
        asMember: true,
        scheduleStartsAt: startsAt,
      })
      setMessage('예약이 취소되었습니다.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '취소 실패')
    }
  }

  const passSummary = passes
    .filter((p) => p.is_unlimited || p.remaining_sessions > 0)
    .map((p) =>
      p.is_unlimited
        ? `${sessionPassLabel(p.pass_type)} 무제한`
        : `${sessionPassLabel(p.pass_type)} ${p.remaining_sessions}회`,
    )

  return (
    <section className={`${cardClass} card-pad space-y-4`}>
      <div>
        <h2 className="text-lg font-semibold text-charcoal">그룹수업 예약</h2>
        <p className="mt-1 text-sm text-muted">
          해당 수업 수강권(잔여 회차)이 있어야 예약할 수 있습니다. 취소는 수업 24시간 전까지
          가능합니다.
        </p>
        {passSummary.length > 0 && (
          <p className="mt-2 text-xs font-medium text-charcoal">
            보유 수강권: {passSummary.join(' · ')}
            {ptRemaining > 0 ? ` · PT ${ptRemaining}회` : ''}
          </p>
        )}
        {!loading && passSummary.length === 0 && ptRemaining <= 0 && (
          <p className="mt-2 text-xs text-amber-800">
            사용 가능한 수강권이 없습니다. 센터에 문의해 주세요.
          </p>
        )}
      </div>

      {loading && <p className="text-sm text-muted">불러오는 중…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      <ul className="space-y-2">
        {schedules.length === 0 && !loading ? (
          <li className="text-sm text-muted">예약 가능한 수업이 없습니다.</li>
        ) : (
          schedules.map((s) => {
            const reserved = Boolean(s.reservation_id)
            const canCancel =
              reserved &&
              s.reservation_status !== 'attended' &&
              s.reservation_status !== 'noshow' &&
              canMemberCancelReservation(s.starts_at)
            const full = (s.reserved_count ?? 0) >= (s.capacity ?? 8)
            const canBook = canMemberBookWithPasses(s, passes, ptRemaining)
            const needsPass = classRequiresSessionPass(
              s.pass_type ?? s.class_type ?? 'pilates',
              s.deduct_sessions ?? true,
            )

            return (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/20 bg-white px-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-charcoal">{s.class_name}</p>
                  <p className="text-xs text-muted">
                    {CLASS_TYPE_LABELS[s.class_type ?? 'pilates']} ·{' '}
                    {formatScheduleLabel(s.starts_at)} · 예약 {s.reserved_count ?? 0}/
                    {s.capacity ?? 8}
                  </p>
                  {reserved && s.reservation_status && (
                    <p className="mt-0.5 text-xs text-charcoal/70">
                      내 예약: {RESERVATION_STATUS_LABELS[s.reservation_status]}
                    </p>
                  )}
                  {!reserved && needsPass && !canBook && (
                    <p className="mt-0.5 text-xs text-amber-800">수강권이 필요합니다</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!reserved && !full && canBook && (
                    <button
                      type="button"
                      className={btnPrimary}
                      onClick={() => void handleReserve(s.id)}
                    >
                      예약
                    </button>
                  )}
                  {canCancel && s.reservation_id && (
                    <button
                      type="button"
                      className={btnOutline}
                      onClick={() =>
                        void handleCancel(
                          s.reservation_id!,
                          s.starts_at,
                          s.reservation_status,
                        )
                      }
                    >
                      취소
                    </button>
                  )}
                  {reserved && !canCancel && s.reservation_status === 'reserved' && (
                    <span className="text-xs text-muted">24시간 이내 취소 불가</span>
                  )}
                </div>
              </li>
            )
          })
        )}
      </ul>
    </section>
  )
}
