import { useCallback, useEffect, useState } from 'react'
import {
  fetchMemberSchedules,
  getTodayScheduledPts,
  scheduleStatusLabel,
  type PtSchedule,
} from '../../api/schedule'
import type { AttendanceLog } from '../../api/memberPortal'
import { fetchTrainers } from '../../api/trainers'
import { formatSupabaseError } from '../../lib/errors'
import { btnGold, cardClass } from '../../styles/theme'
import type { MemberStatus } from '../../types/database'

export type MemberCheckInProps = {
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
  checkIn?: MemberCheckInProps
  variant?: 'home' | 'compact'
  onViewAllSchedule?: () => void
}

function formatTodayHeading(): string {
  return new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

function formatScheduleTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function resolveCheckInBlockReason(checkIn: MemberCheckInProps): string | null {
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
  return null
}

export function MemberTodayAttendancePanel({
  memberId,
  checkIn,
  variant = 'home',
  onViewAllSchedule,
}: Props) {
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
  const attendedToday = Boolean(checkIn?.todayAttendance)
  const checkedInAt = checkIn?.todayAttendance?.checked_in_at ?? null

  const canCheckIn = Boolean(
    checkIn &&
      !checkIn.todayAttendance &&
      checkIn.memberStatus === 'active' &&
      checkIn.remainingSessions > 0 &&
      !checkIn.memberExpired &&
      todaySchedules.length > 0,
  )

  const checkInBlockReason = checkIn ? resolveCheckInBlockReason(checkIn) : null
  const isHome = variant === 'home'

  return (
    <section
      className={`${cardClass} overflow-hidden ${
        isHome ? 'border-2 border-gold/35 shadow-md shadow-gold/10' : ''
      }`}
    >
      <div
        className={`border-b border-gold/20 px-4 ${
          isHome ? 'bg-gradient-to-br from-gold/15 to-cream/80 py-5' : 'py-4'
        }`}
      >
        <p className="text-xs font-semibold text-gold-dark">
          {formatTodayHeading()}
        </p>
        <h2
          className={`mt-1 font-bold text-charcoal ${
            isHome ? 'text-xl' : 'text-base'
          }`}
        >
          오늘 수업 · 출석
        </h2>
        {isHome && (
          <p className="mt-1 text-sm text-charcoal/65">
            예약된 수업을 확인하고 아래 버튼으로 출석하세요.
          </p>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="px-4 py-8 text-center text-sm text-muted">불러오는 중…</p>
      ) : todaySchedules.length === 0 ? (
        <div className="space-y-3 px-4 py-5">
          <p className="text-sm text-charcoal/75">
            오늘 예약된 PT 수업이 없습니다.
          </p>
          {onViewAllSchedule ? (
            <button
              type="button"
              onClick={onViewAllSchedule}
              className="text-sm font-semibold text-motionhub-dark underline-offset-2 hover:underline"
            >
              수업 일정 전체 보기
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4 px-4 py-5">
          <ul className="space-y-3">
            {todaySchedules.map((schedule) => (
              <li
                key={schedule.id}
                className="rounded-xl border border-gold/25 bg-white px-4 py-3.5"
              >
                <p
                  className={`font-bold text-charcoal tabular-nums ${
                    isHome ? 'text-2xl' : 'text-lg'
                  }`}
                >
                  {formatScheduleTime(schedule.scheduled_at)}
                </p>
                <p className="mt-1 text-sm text-charcoal/75">
                  {schedule.trainer_name ?? '트레이너 미지정'} ·{' '}
                  {schedule.duration_minutes}분
                </p>
                {schedule.note ? (
                  <p className="mt-1 text-xs text-charcoal/55">{schedule.note}</p>
                ) : null}
                <span className="mt-2 inline-block rounded-full bg-gold/20 px-2.5 py-0.5 text-[11px] font-semibold text-charcoal">
                  {attendedToday ? '출석 완료' : scheduleStatusLabel(schedule.status)}
                </span>
              </li>
            ))}
          </ul>

          {checkIn && attendedToday ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
              <p className="text-lg font-bold text-emerald-900">오늘 출석 완료</p>
              {checkedInAt ? (
                <p className="mt-1 text-sm text-emerald-800/80 tabular-nums">
                  {new Date(checkedInAt).toLocaleString('ko-KR')}
                </p>
              ) : null}
            </div>
          ) : checkIn ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={checkIn.onCheckIn}
                disabled={checkIn.checkInLoading || !canCheckIn}
                className={`w-full rounded-xl font-bold text-charcoal transition disabled:opacity-50 ${
                  isHome
                    ? 'bg-gold py-4 text-lg shadow-sm hover:bg-gold-dark'
                    : btnGold
                }`}
              >
                {checkIn.checkInLoading ? '처리 중…' : '오늘 출석하기'}
              </button>
              <p className="text-center text-xs text-muted">
                버튼을 누르면 PT 1회가 차감됩니다.
              </p>
              {!canCheckIn && checkInBlockReason ? (
                <p className="text-center text-sm font-medium text-red-600">
                  {checkInBlockReason}
                </p>
              ) : null}
            </div>
          ) : null}

          {onViewAllSchedule ? (
            <button
              type="button"
              onClick={onViewAllSchedule}
              className="w-full rounded-lg border border-charcoal/12 py-2.5 text-sm font-semibold text-charcoal/75 transition hover:bg-cream/60"
            >
              다른 날짜 일정 보기
            </button>
          ) : null}
        </div>
      )}
    </section>
  )
}
