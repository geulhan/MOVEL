import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/admin/PageHeader'
import { PtScheduleCalendar } from '../../components/admin/PtScheduleCalendar'
import { getAdminSession } from '../../lib/adminSession'

export default function SchedulePage() {
  const session = getAdminSession()
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  return (
    <div className="space-y-6">
      <PageHeader
        title="PT 스케줄"
        description="월별 캘린더에서 PT 예약을 등록·관리합니다."
      />

      {toast && (
        <div className="rounded-xl border border-gold/50 bg-white px-4 py-3 text-sm font-medium text-charcoal">
          {toast}
        </div>
      )}

      <PtScheduleCalendar
        onToast={setToast}
        trainerId={
          session?.role === 'trainer' ? session.trainerId ?? undefined : undefined
        }
      />
    </div>
  )
}
