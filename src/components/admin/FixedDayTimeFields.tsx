import { inputClass } from '../../styles/theme'
import { WEEKDAYS } from '../../utils/calendar'
import type { DayTimeMap } from '../../utils/fixedScheduleDates'

type Props = {
  days: number[]
  dayTimes: DayTimeMap
  defaultTime: string
  onChange: (day: number, time: string) => void
}

export function FixedDayTimeFields({
  days,
  dayTimes,
  defaultTime,
  onChange,
}: Props) {
  if (days.length === 0) return null

  return (
    <div className="space-y-2 rounded-lg border border-gold/20 bg-cream/40 p-3">
      <p className="text-xs font-medium text-charcoal/70">요일별 시간</p>
      {days.map((day) => (
        <label key={day} className="flex items-center justify-between gap-3 text-sm">
          <span className="min-w-[3rem] font-medium text-charcoal">{WEEKDAYS[day]}</span>
          <input
            type="time"
            required
            value={dayTimes[day] ?? defaultTime}
            onChange={(e) => onChange(day, e.target.value)}
            className={`${inputClass} min-w-0 flex-1`}
          />
        </label>
      ))}
    </div>
  )
}
