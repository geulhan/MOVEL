import { SalesDashboard } from '../../components/admin/SalesDashboard'
import { OperationalKpiSidebar } from '../../components/admin/OperationalKpiSidebar'
import { ClassDashboardKpi } from '../../components/admin/ClassDashboardKpi'
import { CenterOnboardingPanel } from '../../components/admin/CenterOnboardingPanel'
import { PageHeader } from '../../components/admin/PageHeader'
import { RenewalDashboard } from '../../components/RenewalDashboard'
import { fetchMembers } from '../../api/members'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { computeRenewalStats, type RenewalFilter } from '../../utils/renewal'
import { formatSupabaseError } from '../../lib/errors'

export default function DashboardPage() {
  const [members, setMembers] = useState<Awaited<ReturnType<typeof fetchMembers>>>([])
  const [renewalFilter, setRenewalFilter] = useState<RenewalFilter>('all')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchMembers()
      setMembers(data)
      setError(null)
    } catch (err) {
      setError(formatSupabaseError(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => computeRenewalStats(members), [members])

  return (
    <div className="space-y-6">
      <PageHeader
        title="대시보드"
        description="매출·재등록 현황을 한눈에 확인합니다."
      />

      {error && (
        <div className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <CenterOnboardingPanel />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_15.5rem]">
        <div className="min-w-0 space-y-6">
          <ClassDashboardKpi />
          <SalesDashboard />
          <RenewalDashboard
            stats={stats}
            activeFilter={renewalFilter}
            onFilterChange={setRenewalFilter}
          />
        </div>
        <OperationalKpiSidebar />
      </div>
    </div>
  )
}
