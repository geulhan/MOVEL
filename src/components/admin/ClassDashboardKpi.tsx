import { useEffect, useState } from 'react'
import { fetchClassDashboardStats } from '../../api/classes'
import { todayDateString } from '../../api/members'
import { cardClass } from '../../styles/theme'
import { isClassFeatureEnabled } from '../../types/centerFeatures'
import { useCenterFeatures } from '../../hooks/useCenterFeatures'

export function ClassDashboardKpi() {
  const { features } = useCenterFeatures()
  const [stats, setStats] = useState({
    todayClassCount: 0,
    todayReservationCount: 0,
    avgFillRate: 0,
    attendanceRate: 0,
    noshowRate: 0,
    popularClasses: [] as Array<{ name: string; count: number }>,
  })

  useEffect(() => {
    if (!isClassFeatureEnabled(features)) return
    void fetchClassDashboardStats(todayDateString()).then(setStats).catch(() => {})
  }, [features])

  if (!isClassFeatureEnabled(features)) return null

  return (
    <section className={`${cardClass} card-pad space-y-4`}>
      <div>
        <h2 className="text-lg font-semibold text-charcoal">오늘 클래스</h2>
        <p className="text-sm text-muted">예약률·출석률·인기 수업</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <p className="text-xs text-muted">오늘 수업</p>
          <p className="text-xl font-bold">{stats.todayClassCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted">오늘 예약</p>
          <p className="text-xl font-bold">{stats.todayReservationCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted">예약률</p>
          <p className="text-xl font-bold">{stats.avgFillRate}%</p>
        </div>
        <div>
          <p className="text-xs text-muted">출석률</p>
          <p className="text-xl font-bold">{stats.attendanceRate}%</p>
        </div>
        <div>
          <p className="text-xs text-muted">노쇼율</p>
          <p className="text-xl font-bold">{stats.noshowRate}%</p>
        </div>
      </div>
      {stats.popularClasses.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-muted">인기 클래스</p>
          <ol className="space-y-1 text-sm">
            {stats.popularClasses.map((item, index) => (
              <li key={item.name} className="flex justify-between gap-2">
                <span>
                  {index + 1}. {item.name}
                </span>
                <span className="text-muted">{item.count}건</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
