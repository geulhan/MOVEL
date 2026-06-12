import { useCallback, useEffect, useState } from 'react'
import {
  fetchMemberSchedules,
  getTodayScheduledPts,
  hasScheduledPtToday,
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

function formatCheckedInAt(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR')
}

function getFutureScheduledPts(schedules: PtSchedule[]): PtSchedule[] {
  const now = new Date()
  return schedules
    .filter(
      (s) =>
        s.status === 'scheduled' &&
        !isSameLocalDay(s.scheduled_at) &&
        new Date(s.scheduled_at) > now,
    )
    .sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
    )
}

type CheckInProps = {
  todayAttendance: AttendanceLog | null
  recentAttendance: AttendanceLog[]
  checkInLoading: boolean
  onCheckIn: () => void
  memberStatus: MemberStatus
  remainingSessions: number
  memberExpired: boolean
}

type Props = {
  memberId: string
  checkIn?: CheckInProps
}

type ScheduleCardProps = {
  schedule: PtSchedule
  attended?: boolean
  checkedInAt?: string | null
  showCheckIn?: boolean
  checkInLoading?: boolean
  canCheckIn?: boolean
  onCheckIn?: () => void
  checkInBlockReason?: string | null
}

function ScheduleCard({
  schedule,
  attended = false,
  checkedInAt,
  showCheckIn = false,
  checkInLoading = false,
  canCheckIn = false,
  onCheckIn,
  checkInBlockReason,
}: ScheduleCardProps) {
  return (
    <li
      className={`rounded-xl border p-4 ${
        attended
          ? 'border-emerald-200 bg-emerald-50/60'
          : 'border-gold/30 bg-cream/50'
      }`}
    >
      <p className="font-semibold text-charcoal tabular-nums">
        {formatScheduleDateTime(schedule.scheduled_at)}
      </p>
      <p className="mt-1 text-sm text-charcoal/70">
        {schedule.trainer_name ?? '트레이너 미지정'} · {schedule.duration_minutes}
        분
      </p>
      {schedule.note && (
        <p className="mt-1 truncate text-xs text-charcoal/55">{schedule.note}</p>
      )}

      {attended ? (
        <div className="mt-3">
          <span className="inline-block rounded-full bg-emerald-600/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
            ✓ 출석 완료
          </span>
          {checkedInAt && (
            <p className="mt-1 text-xs text-muted tabular-nums">
              {formatCheckedInAt(checkedInAt)}
            </p>
          )}
        </div>
      ) : (
        <span className="mt-2 inline-block rounded-full bg-gold/25 px-2 py-0.5 text-[11px] font-semibold text-charcoal">
          {scheduleStatusLabel(schedule.status)}
        </span>
      )}

      {showCheckIn && !attended && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onCheckIn}
            disabled={checkInLoading || !canCheckIn}
            className={`w-full ${btnGold}`}
          >
            {checkInLoading ? '처리 중…' : '출석하기 (PT 1회 차감)'}
          </button>
          {checkInBlockReason && (
            <p className="mt-2 text-xs text-red-600">{checkInBlockReason}</p>
          )}
        </div>
      )}
    </li>
  )
}

function resolveCheckInBlockReason(
  checkIn: CheckInProps,
  hasTodayPt: boolean,
): string | null {
  if (checkIn.todayAttendance) return null
  if (checkIn.memberStatus !== 'active') {
    return '활성 회원만 출석할 수 있습니다.'
  }
  if (checkIn.remainingSessions <= 0) {
    return '잔여 PT가 없어 출석할 수 없습니다.'
  }
  if (checkIn.memberExpired) {
    return '회원권 만료일이 지나 출석할 수 없습니다.'
  }
  if (!hasTodayPt) {
    return '오늘 PT 예약이 있어야 출석할 수 있습니다.'
  }
  return null
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

  const todaySchedules = getTodayScheduledPts(schedules)
  const futureSchedules = getFutureScheduledPts(schedules)
  const hasTodayPt = hasScheduledPtToday(schedules)
  const attendedToday = Boolean(checkIn?.todayAttendance)
  const checkedInAt = checkIn?.todayAttendance?.checked_in_at ?? null

  const canCheckIn = Boolean(
    checkIn &&
      !checkIn.todayAttendance &&
      checkIn.memberStatus === 'active' &&
      checkIn.remainingSessions > 0 &&
      !checkIn.memberExpired &&
      hasTodayPt,
  )

  const checkInBlockReason = checkIn
    ? resolveCheckInBlockReason(checkIn, hasTodayPt)
    : null

  const pastAttendance =
    checkIn?.recentAttendance.filter(
      (a) => !isSameLocalDay(a.checked_in_at),
    ) ?? []

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="border-b border-gold/20 px-4 py-4">
        <h3 className="font-semibold text-charcoal">수업 일정</h3>
        <p className="mt-1 text-xs text-muted">
          오늘 수업 출석과 예정 일정을 확인할 수 있습니다.
        </p>
      </div>

      {error && (
        <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="px-4 py-10 text-center text-sm text-muted">불러오는 중…</p>
      ) : (
        <div className="divide-y divide-gold/15">
          <div className="px-4 py-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
              당일
            </h4>
            {todaySchedules.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                오늘 예정된 수업이 없습니다.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {todaySchedules.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    attended={attendedToday}
                    checkedInAt={checkedInAt}
                    showCheckIn={Boolean(checkIn)}
                    checkInLoading={checkIn?.checkInLoading}
                    canCheckIn={canCheckIn}
                    onCheckIn={checkIn?.onCheckIn}
                    checkInBlockReason={
                      canCheckIn ? null : checkInBlockReason
                    }
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="px-4 py-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
              예정
            </h4>
            {futureSchedules.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                예정된 수업이 없습니다.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {futureSchedules.map((schedule) => (
                  <ScheduleCard key={schedule.id} schedule={schedule} />
                ))}
              </ul>
            )}
          </div>

          {checkIn && (
            <div className="px-4 py-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                최근 출석 현황
              </h4>
              {pastAttendance.length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  최근 출석 기록이 없습니다.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-gold/15 text-sm">
                  {pastAttendance.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2 py-2.5"
                    >
                      <span className="text-charcoal/80">PT 출석</span>
                      <span className="tabular-nums text-muted">
                        {formatCheckedInAt(a.checked_in_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
