import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchPlatformDashboard } from '../../api/platformDashboard'
import { getErrorMessage } from '../../lib/errors'
import { PlatformSessionExpiredError } from '../../lib/platformRpc'
import type { PlatformDashboardSnapshot } from '../../types/platformOps'
import {
  formatKrw,
  PlatformKpiGrid,
  PlatformRankList,
  PlatformSection,
} from '../../components/platform/PlatformOpsUi'
import { PLATFORM_ACTIVITY_LABELS } from '../../types/platformOps'
import { btnOutline, btnPrimary } from '../../styles/theme'

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

export default function PlatformDashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<PlatformDashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetchPlatformDashboard())
    } catch (err) {
      if (err instanceof PlatformSessionExpiredError) {
        navigate('/platform/login', { replace: true })
        return
      }
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return <p className="text-sm text-cream/60">대시보드 불러오는 중…</p>
  }

  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error ?? '데이터 없음'}
        </p>
        <p className="text-xs text-cream/50">
          오류가 계속되면 Supabase에서 migration_077_platform_dashboard_fix.sql 실행 후
          플랫폼 로그아웃 → 다시 로그인해 보세요.
        </p>
        <button type="button" onClick={() => void load()} className={btnOutline}>
          다시 시도
        </button>
      </div>
    )
  }

  const { kpi, monthly, rankings, beta_alerts, recent_activity } = data

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">플랫폼 대시보드</h1>
          <p className="mt-1 text-sm text-cream/60">
            MotionHub 전체 센터·회원·매출·이용 현황을 한눈에 확인합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/platform/centers" className={btnOutline}>
            센터 목록
          </Link>
          <Link to="/platform/centers/new" className={btnPrimary}>
            + 센터 생성
          </Link>
        </div>
      </div>

      <PlatformSection title="플랫폼 KPI">
        <PlatformKpiGrid
          columns={4}
          items={[
            { label: '총 센터', value: kpi.total_centers },
            { label: '활성 센터', value: kpi.active_centers },
            { label: '베타 센터', value: kpi.beta_centers },
            { label: '만료 센터', value: kpi.expired_centers },
            { label: '전체 회원', value: kpi.total_members },
            { label: '관리자', value: kpi.total_admins },
            { label: '트레이너', value: kpi.total_trainers },
          ]}
        />
      </PlatformSection>

      <PlatformSection title="이번 달 지표" description="KST 기준 당월">
        <PlatformKpiGrid
          items={[
            { label: '신규 센터', value: monthly.new_centers },
            { label: '신규 회원', value: monthly.new_members },
            { label: '결제 건수', value: monthly.payment_count },
            { label: '총 결제 매출', value: formatKrw(monthly.payment_revenue) },
            { label: '메시지 사용', value: monthly.message_usage, sub: '발송 성공 건수' },
          ]}
        />
      </PlatformSection>

      <PlatformSection title="센터별 순위 TOP 10">
        <div className="grid gap-4 lg:grid-cols-2">
          <PlatformRankList title="회원 수" unit="명" items={rankings.members} />
          <PlatformRankList
            title="이번 달 매출"
            items={rankings.revenue}
            formatValue={(v) => formatKrw(v)}
          />
          <PlatformRankList
            title="출석률 (30일)"
            items={rankings.attendance}
            formatValue={(v) => `${v}%`}
          />
          <PlatformRankList
            title="예약 이행률 (30일)"
            items={rankings.booking}
            formatValue={(v) => `${v}%`}
          />
        </div>
      </PlatformSection>

      {(beta_alerts.inactive_7d.length > 0 || beta_alerts.inactive_14d.length > 0) && (
        <PlatformSection title="베타 운영 알림">
          <div className="grid gap-4 lg:grid-cols-2">
            {beta_alerts.inactive_7d.length > 0 && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
                <h3 className="text-sm font-semibold text-amber-100">7일 미접속 베타 센터</h3>
                <ul className="mt-2 space-y-1 text-sm text-amber-50/90">
                  {beta_alerts.inactive_7d.slice(0, 5).map((c) => (
                    <li key={c.id}>
                      <Link to={`/platform/centers/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                      <span className="ml-2 text-xs text-amber-100/60">
                        {formatWhen(c.last_activity_at)}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link to="/platform/beta" className="mt-3 inline-block text-xs text-amber-200 underline">
                  전체 보기
                </Link>
              </div>
            )}
            {beta_alerts.inactive_14d.length > 0 && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4">
                <h3 className="text-sm font-semibold text-red-100">14일 미접속 베타 센터</h3>
                <ul className="mt-2 space-y-1 text-sm text-red-50/90">
                  {beta_alerts.inactive_14d.slice(0, 5).map((c) => (
                    <li key={c.id}>
                      <Link to={`/platform/centers/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </PlatformSection>
      )}

      <PlatformSection title="최근 플랫폼 활동">
        {recent_activity.length === 0 ? (
          <p className="text-sm text-cream/50">활동 로그가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-cream/50">
                <tr>
                  <th className="px-4 py-2.5">시간</th>
                  <th className="px-4 py-2.5">센터</th>
                  <th className="px-4 py-2.5">활동</th>
                </tr>
              </thead>
              <tbody>
                {recent_activity.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 text-cream/85">
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                      {formatWhen(row.created_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/platform/centers/${row.center_id}`}
                        className="text-sky-300 hover:underline"
                      >
                        {row.center_name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      {PLATFORM_ACTIVITY_LABELS[row.action] ?? row.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PlatformSection>
    </div>
  )
}
