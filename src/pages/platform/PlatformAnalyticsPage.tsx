import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPlatformAnalytics } from '../../api/platformAnalytics'
import type { PlatformAnalyticsSnapshot } from '../../types/platformOps'
import { PlatformKpiGrid, PlatformSection } from '../../components/platform/PlatformOpsUi'
import { btnOutline } from '../../styles/theme'

const FEATURE_LABELS: Record<keyof PlatformAnalyticsSnapshot['feature_totals'], string> = {
  member_manage: '회원관리',
  schedule: '예약',
  attendance: '출석',
  journal: '운동일지',
  message: '메시지',
  payment: '결제',
  analytics: '경영분석',
}

export default function PlatformAnalyticsPage() {
  const [data, setData] = useState<PlatformAnalyticsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetchPlatformAnalytics())
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 데이터를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <p className="text-sm text-cream/60">불러오는 중…</p>
  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-200">{error ?? '데이터 없음'}</p>
        <button type="button" onClick={() => void load()} className={btnOutline}>다시 시도</button>
      </div>
    )
  }

  const totals = data.feature_totals
  const sortedFeatures = (Object.keys(FEATURE_LABELS) as Array<keyof typeof FEATURE_LABELS>)
    .map((key) => ({ key, label: FEATURE_LABELS[key], value: totals[key] }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">사용 현황 분석</h1>
        <p className="mt-1 text-sm text-cream/60">최근 30일 플랫폼 활동 로그 기준</p>
      </div>

      <PlatformSection title="가장 많이 사용한 기능">
        <PlatformKpiGrid
          columns={3}
          items={sortedFeatures.map((f) => ({ label: f.label, value: f.value, sub: '회' }))}
        />
      </PlatformSection>

      <PlatformSection title="센터별 사용률">
        {data.centers.length === 0 ? (
          <p className="text-sm text-cream/50">활동 로그가 없습니다. 주요 기능 사용 시 자동 집계됩니다.</p>
        ) : (
          <div className="space-y-4">
            {data.centers
              .filter((c) =>
                c.member_manage + c.schedule + c.attendance + c.journal + c.message + c.payment + c.analytics > 0,
              )
              .map((center) => (
                <article
                  key={center.id}
                  className="rounded-xl border border-white/10 bg-[#161d26] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-white">
                      <Link to={`/platform/centers/${center.id}`} className="hover:underline">
                        {center.name}
                      </Link>
                    </h3>
                    <span className="font-mono text-xs text-cream/45">{center.slug}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    {sortedFeatures.map((f) => {
                      const key = f.key as keyof typeof center
                      const val = Number(center[key] ?? 0)
                      if (val === 0) return null
                      return (
                        <div key={f.key}>
                          <dt className="text-xs text-cream/45">{f.label}</dt>
                          <dd className="font-semibold tabular-nums text-emerald-300">{val}회</dd>
                        </div>
                      )
                    })}
                  </dl>
                </article>
              ))}
          </div>
        )}
      </PlatformSection>
    </div>
  )
}
