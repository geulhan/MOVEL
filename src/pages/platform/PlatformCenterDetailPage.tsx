import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchPlatformCenterDetail } from '../../api/platformCenterDetail'
import type { PlatformCenterDetail } from '../../types/platformOps'
import { PLATFORM_ACTIVITY_LABELS } from '../../types/platformOps'
import { formatKrw, PlatformKpiGrid, PlatformSection } from '../../components/platform/PlatformOpsUi'
import { btnOutline } from '../../styles/theme'

type Tab = 'info' | 'ops' | 'finance' | 'message'

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return String(iso).slice(0, 10)
}

export default function PlatformCenterDetailPage() {
  const { centerId } = useParams<{ centerId: string }>()
  const [data, setData] = useState<PlatformCenterDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('info')

  const load = useCallback(async () => {
    if (!centerId) return
    setLoading(true)
    setError(null)
    try {
      setData(await fetchPlatformCenterDetail(centerId))
    } catch (err) {
      setError(err instanceof Error ? err.message : '센터 정보를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [centerId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <p className="text-sm text-cream/60">불러오는 중…</p>
  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-200">{error ?? '데이터 없음'}</p>
        <Link to="/platform/centers" className={btnOutline}>센터 목록</Link>
      </div>
    )
  }

  const { center, operations, finance, messaging, messaging_usage, recent_activity } = data
  const msg = messaging as Record<string, unknown>
  const balance = Number(msg.balance ?? 0)
  const totalUsed = Number(msg.total_used ?? 0)

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'info', label: '기본정보' },
    { id: 'ops', label: '운영' },
    { id: 'finance', label: '경영' },
    { id: 'message', label: '메시지' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Link to="/platform/centers" className="text-xs text-cream/50 hover:text-cream">← 센터 목록</Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{center.name}</h1>
        <p className="mt-1 font-mono text-sm text-cream/55">{center.slug}</p>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm ${
              tab === t.id ? 'bg-white/10 text-white' : 'text-cream/60 hover:text-cream'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'info' && (
        <PlatformSection title="센터 정보">
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              ['상태', center.status],
              ['요금제', center.plan_code ?? '—'],
              ['생성일', formatDate(center.created_at)],
              ['이용 시작', formatDate(center.service_starts_at)],
              ['만료일', formatDate(center.service_ends_at)],
              ['베타', center.beta_trial ? 'Y' : 'N'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-[#161d26] px-4 py-3">
                <dt className="text-xs text-cream/50">{label}</dt>
                <dd className="mt-1 text-sm font-medium text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </PlatformSection>
      )}

      {tab === 'ops' && (
        <PlatformSection title="운영 현황">
          <PlatformKpiGrid
            items={[
              { label: '회원 수', value: operations.member_count },
              { label: '활성 회원', value: operations.active_members },
              { label: '휴면 회원', value: operations.dormant_members },
              { label: '트레이너', value: operations.trainer_count },
              { label: '예약 (30일)', value: operations.schedule_count },
              { label: '출석률', value: `${operations.attendance_rate}%` },
              { label: '노쇼율', value: `${operations.noshow_rate}%` },
            ]}
          />
        </PlatformSection>
      )}

      {tab === 'finance' && (
        <PlatformSection title="경영 현황" description="플랫폼 조회용 요약 (읽기 전용)">
          <PlatformKpiGrid
            items={[
              { label: '총 매출', value: formatKrw(finance.total_revenue) },
              { label: '이번 달 매출', value: formatKrw(finance.month_revenue) },
              { label: '인식 매출 (당월)', value: formatKrw(finance.recognized_revenue) },
              { label: '선수금 추정', value: formatKrw(finance.prepaid_estimate) },
              { label: '환불 예상', value: formatKrw(finance.refund_estimate) },
            ]}
          />
        </PlatformSection>
      )}

      {tab === 'message' && (
        <PlatformSection title="메시지 현황">
          <PlatformKpiGrid
            items={[
              { label: '잔여 크레딧', value: balance },
              { label: '이번 달 사용', value: messaging_usage.month_total },
              { label: '누적 사용', value: totalUsed },
              { label: '자동발송 (당월)', value: messaging_usage.month_auto },
              { label: '공지발송 (당월)', value: messaging_usage.month_campaign },
            ]}
          />
        </PlatformSection>
      )}

      <PlatformSection title="최근 활동">
        {recent_activity.length === 0 ? (
          <p className="text-sm text-cream/50">활동 로그 없음</p>
        ) : (
          <ul className="space-y-2">
            {recent_activity.map((row, i) => (
              <li key={i} className="rounded-lg border border-white/10 bg-[#161d26] px-4 py-2.5 text-sm">
                <span className="text-cream/85">{PLATFORM_ACTIVITY_LABELS[row.action] ?? row.action}</span>
                <span className="ml-2 text-xs text-cream/45">{formatWhen(row.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </PlatformSection>
    </div>
  )
}
