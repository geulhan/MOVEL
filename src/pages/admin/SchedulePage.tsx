import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/admin/PageHeader'
import { PAGE_HELP } from '../../lib/pageHelpTips'
import { PtScheduleCalendar } from '../../components/admin/PtScheduleCalendar'
import { fetchTrainers } from '../../api/trainers'
import { getAdminSession } from '../../lib/adminSession'
import { inputClass } from '../../styles/theme'
import type { Trainer } from '../../types/database'

type SchedulePageProps = {
  embedded?: boolean
  highlightMemberId?: string
}

export default function SchedulePage({
  embedded = false,
  highlightMemberId,
}: SchedulePageProps = {}) {
  const session = getAdminSession()
  const isAdmin = session?.role === 'admin'
  const lockedTrainerId =
    session?.role === 'trainer' ? session.trainerId ?? undefined : undefined

  const [toast, setToast] = useState<string | null>(null)
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [filterTrainerId, setFilterTrainerId] = useState('')

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

  return (
    <div className="space-y-6">
      {!embedded && (
        <PageHeader
          title="센터 일정"
          description="PT·그룹수업 일정을 한곳에서 확인합니다. PT 출석(완료) 처리는 관리자만 할 수 있습니다."
          helpText={PAGE_HELP.schedule}
        />
      )}

      {highlightMemberId && (
        <p className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-900">
          회원 예약 필터가 적용되었습니다. 캘린더에서 해당 회원 일정을 확인하세요.
        </p>
      )}

      {isAdmin && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[12rem] text-sm">
            <span className="mb-1 block font-medium text-charcoal/70">
              강사 보기
            </span>
            <select
              value={filterTrainerId}
              onChange={(e) => setFilterTrainerId(e.target.value)}
              className={inputClass}
            >
              <option value="">전체 강사</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <p className="pb-2 text-xs text-muted">
            강사를 선택하면 해당 강사의 PT·그룹수업 일정만 표시됩니다.
          </p>
        </div>
      )}

      {toast && (
        <div className="rounded-xl border border-gold/50 bg-white px-4 py-3 text-sm font-medium text-charcoal">
          {toast}
        </div>
      )}

      <PtScheduleCalendar
        onToast={setToast}
        lockedTrainerId={lockedTrainerId}
        filterTrainerId={filterTrainerId || undefined}
        isAdmin={isAdmin}
        showClassSchedules
      />
    </div>
  )
}
