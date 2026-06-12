import { useCallback, useEffect, useState } from 'react'
import {
  fetchMemberSchedules,
  getTodayScheduledPts,
  scheduleStatusLabel,
  type PtSchedule,
} from '../api/schedule'
import type { AttendanceLog } from '../api/memberPortal'
import { isSameLocalDay } from '../utils/date'
import { fetchTrainers } from '../api/trainers'
import { formatSupabaseError } from '../lib/errors'
import { btnGold, cardClass } from '../styles/theme'
import type { MemberStatus } from '../types/database'

function formatScheduleDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type CheckInProps = {
  todaySchedules: PtSchedule[]
  todayAttendance: AttendanceLog | null
  recentAttendance: AttendanceLog[]
  canCheckIn: boolean
  checkInLoading: boolean
  onCheckIn: () => void
  memberStatus: MemberStatus
  remainingSessions: number
  memberExpired: boolean
  hasTodayPt: boolean
}

type Props = {
  memberId: string
  checkIn?: CheckInProps
}

export function MemberScheduleSection({ memberId, checkIn }: Props) {
  const [schedules, setSchedules] = useState<PtSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, trainers] = await Promise.all([
        fetchMemberSchedules(memberId),
        fetchTrainers(),
      ])
      const trainerMap = new Map(trainers.map((t) => [t.id, t.name]))
      setSchedules(
        data.map((s) => ({
          ...s,
          trainer_name: s.trainer_id
            ? trainerMap.get(s.trainer_id)
            : undefined,
        })),
      )
    } catch (err) {
      setError(formatSupabaseError(err))
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void load()
  }, [load])

  const todaySchedules =
    checkIn?.todaySchedules ?? getTodayScheduledPts(schedules)

  const upcoming = schedules.filter(
    (s) =>
      s.status === 'scheduled' &&
      (new Date(s.scheduled_at) >= new Date() || isSameLocalDay(s.scheduled_at)),
  )
  const past = schedules.filter((s) => !upcoming.includes(s))

  return (
    <div className="space-y-4">
      {checkIn && (
        <section className={`${cardClass} p-6 text-center`}>
          <h3 className="font-semibold text-charcoal">오늘의 출석</h3>
          {todaySchedules.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-charcoal/80">
              {todaySchedules.map((s) => (
                <li key={s.id} className="tabular-nums">
                  오늘 PT ·{' '}
                  {new Date(s.scheduled_at).toLocaleString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-amber-800">
              오늘 예약된 PT가 없습니다. 센터에서 스케줄 등록 후 출석할 수
              있습니다.
            </p>
          )}
          {checkIn.todayAttendance ? (
            <>
              <p className="mt-3 font-semibold text-emerald-700">✓ 출석 완료</p>
              <p className="mt-1 text-xs text-muted">
                {new Date(checkIn.todayAttendance.checked_in_at).toLocaleString(
                  'ko-KR',
                )}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">
                아직 오늘 출석하지 않았습니다.
              </p>
              <button
                type="button"
                onClick={checkIn.onCheckIn}
                disabled={checkIn.checkInLoading || !checkIn.canCheckIn}
                className={`mt-4 w-full ${btnGold}`}
              >
                {checkIn.checkInLoading ? '처리 중…' : '출석하기 (PT 1회 차감)'}
              </button>
              {checkIn.memberStatus !== 'active' && (
                <p className="mt-2 text-xs text-red-600">
                  활성 회원만 출석할 수 있습니다.
                </p>
              )}
              {checkIn.memberStatus === 'active' &&
                checkIn.remainingSessions <= 0 && (
                  <p className="mt-2 text-xs text-red-600">
                    잔여 PT가 없어 출석할 수 없습니다.
                  </p>
                )}
              {checkIn.memberStatus === 'active' &&
                checkIn.remainingSessions > 0 &&
                checkIn.memberExpired && (
                  <p className="mt-2 text-xs text-red-600">
                    회원권 만료일이 지나 출석할 수 없습니다.
                  </p>
                )}
              {checkIn.memberStatus === 'active' &&
                checkIn.remainingSessions > 0 &&
                !checkIn.memberExpired &&
                !checkIn.hasTodayPt && (
                  <p className="mt-2 text-xs text-red-600">
                    오늘 PT 예약이 있어야 출석할 수 있습니다.
                  </p>
                )}
            </>
          )}

          {checkIn.recentAttendance.length > 0 && (
            <div className="mt-6 border-t border-gold/15 pt-4 text-left">
              <h4 className="text-sm font-semibold text-charcoal">최근 출석</h4>
              <ul className="mt-2 divide-y divide-gold/15 text-sm">
                {checkIn.recentAttendance.map((a) => (
                  <li key={a.id} className="py-2 text-muted">
                    {new Date(a.checked_in_at).toLocaleString('ko-KR')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-gold/20 px-4 py-4">
          <h3 className="font-semibold text-charcoal">수업 일정</h3>
          <p className="mt-1 text-xs text-muted">
            센터에서 등록한 PT 예약 일정입니다.
          </p>
        </div>

        {error && (
          <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            불러오는 중…
          </p>
        ) : schedules.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            등록된 수업 일정이 없습니다.
          </p>
        ) : (
          <div className="divide-y divide-gold/15">
            {upcoming.length > 0 && (
              <div className="px-4 py-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
                  예정 수업
                </h4>
                <ul className="mt-3 space-y-3">
                  {upcoming.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-xl border border-gold/30 bg-cream/50 p-4"
                    >
                      <p className="font-semibold text-charcoal tabular-nums">
                        {formatScheduleDateTime(s.scheduled_at)}
                      </p>
                      <p className="mt-1 text-sm text-charcoal/70">
                        {s.trainer_name ?? '트레이너 미지정'} ·{' '}
                        {s.duration_minutes}분
                      </p>
                      {s.note && (
                        <p className="mt-1 truncate text-xs text-charcoal/55">
                          {s.note}
                        </p>
                      )}
                      <span className="mt-2 inline-block rounded-full bg-gold/25 px-2 py-0.5 text-[11px] font-semibold text-charcoal">
                        {scheduleStatusLabel(s.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {past.length > 0 && (
              <div className="px-4 py-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                  지난 일정
                </h4>
                <ul className="mt-3 space-y-2">
                  {past.slice(0, 10).map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-gold/10 pb-2 text-sm last:border-0"
                    >
                      <span className="text-charcoal/80 tabular-nums">
                        {formatScheduleDateTime(s.scheduled_at)}
                      </span>
                      <span className="text-xs text-charcoal/50">
                        {scheduleStatusLabel(s.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
