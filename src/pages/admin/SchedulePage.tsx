import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/admin/PageHeader'
import { FixedSchedulePanel } from '../../components/admin/FixedSchedulePanel'
import { PtScheduleCalendar } from '../../components/admin/PtScheduleCalendar'
import { fetchTrainers } from '../../api/trainers'
import { getAdminSession } from '../../lib/adminSession'
import { inputClass } from '../../styles/theme'
import type { Trainer } from '../../types/database'

type Tab = 'calendar' | 'fixed'

export default function SchedulePage() {
  const session = getAdminSession()
  const isAdmin = session?.role === 'admin'
  const lockedTrainerId =
    session?.role === 'trainer' ? session.trainerId ?? undefined : undefined

  const [tab, setTab] = useState<Tab>('calendar')
  const [toast, setToast] = useState<string | null>(null)
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [filterTrainerId, setFilterTrainerId] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!isAdmin) return
    void fetchTrainers()
      .then(setTrainers)
      .catch(() => setTrainers([]))
  }, [isAdmin])

  function bumpRefresh() {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="PT 스케줄"
        description="고정·개별 PT 예약을 관리합니다. 세션 차감은 출석 처리 시에만 됩니다."
      />

      {isAdmin && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[12rem] text-sm">
            <span className="mb-1 block font-medium text-charcoal/70">
              트레이너 보기
            </span>
            <select
              value={filterTrainerId}
              onChange={(e) => setFilterTrainerId(e.target.value)}
              className={inputClass}
            >
              <option value="">전체 트레이너</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <p className="pb-2 text-xs text-muted">
            트레이너를 선택하면 해당 트레이너 일정만 표시되며, 취소·삭제를 관리할
            수 있습니다.
          </p>
        </div>
      )}

      <nav className="chip-scroll">
        <button
          type="button"
          onClick={() => setTab('calendar')}
          className={`chip ${tab === 'calendar' ? 'chip-active' : 'chip-inactive'}`}
        >
          캘린더
        </button>
        <button
          type="button"
          onClick={() => setTab('fixed')}
          className={`chip ${tab === 'fixed' ? 'chip-active' : 'chip-inactive'}`}
        >
          고정 수업
        </button>
      </nav>

      {toast && (
        <div className="rounded-xl border border-gold/50 bg-white px-4 py-3 text-sm font-medium text-charcoal">
          {toast}
        </div>
      )}

      {tab === 'calendar' ? (
        <PtScheduleCalendar
          onToast={setToast}
          lockedTrainerId={lockedTrainerId}
          filterTrainerId={filterTrainerId || undefined}
          isAdmin={isAdmin}
          refreshKey={refreshKey}
        />
      ) : (
        <FixedSchedulePanel
          onToast={setToast}
          lockedTrainerId={lockedTrainerId}
          filterTrainerId={filterTrainerId || undefined}
          onChanged={bumpRefresh}
        />
      )}
    </div>
  )
}
