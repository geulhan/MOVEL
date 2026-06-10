import { useCallback, useEffect, useState } from 'react'
import {
  fetchMemberSchedules,
  scheduleStatusLabel,
  type PtSchedule,
} from '../api/schedule'
import { fetchTrainers } from '../api/trainers'
import { formatSupabaseError } from '../lib/errors'
import { cardClass } from '../styles/theme'

function formatScheduleDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type Props = {
  memberId: string
}

export function MemberScheduleSection({ memberId }: Props) {
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

  const upcoming = schedules.filter(
    (s) => s.status === 'scheduled' && new Date(s.scheduled_at) >= new Date(),
  )
  const past = schedules.filter(
    (s) => !(s.status === 'scheduled' && new Date(s.scheduled_at) >= new Date()),
  )

  return (
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
        <p className="px-4 py-10 text-center text-sm text-muted">불러오는 중…</p>
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
                      {s.trainer_name ?? '트레이너 미지정'} · {s.duration_minutes}
                      분
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
  )
}
