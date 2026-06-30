import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchBusinessAnalytics } from '../../api/businessAnalytics'
import {
  fetchBusinessAnalyticsSettings,
  saveBusinessAnalyticsSettings,
  sumFixedCosts,
} from '../../api/businessAnalyticsSettings'
import { formatCurrency } from '../../api/members'
import { fetchTrainers } from '../../api/trainers'
import { BusinessMonthlyReportPanel } from '../../components/admin/BusinessMonthlyReportPanel'
import { PageHeader } from '../../components/admin/PageHeader'
import { formatSupabaseError } from '../../lib/errors'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'
import type { BusinessAnalyticsSnapshot } from '../../types/businessAnalytics'
import {
  DEFAULT_BUSINESS_ANALYTICS_SETTINGS,
  type BusinessAnalyticsSettings,
} from '../../types/businessAnalytics'
import type { Trainer } from '../../types/database'

type BusinessAnalyticsTab = 'dashboard' | 'report'

const TAB_LABELS: Record<BusinessAnalyticsTab, string> = {
  dashboard: '경영 대시보드',
  report: 'AI 월간 보고서',
}

function parseAnalyticsTab(value: string | null): BusinessAnalyticsTab {
  if (value === 'dashboard') return 'dashboard'
  return 'report'
}

function KpiCard({
  label,
  value,
  sub,
  highlight,
  danger,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
  danger?: boolean
}) {
  return (
    <div
      className={`${cardClass} min-w-0 p-4 ${highlight ? 'border-charcoal/30 bg-charcoal text-cream' : ''} ${danger ? 'border-red-300/70 bg-red-50' : ''}`}
    >
      <p
        className={`truncate text-xs font-medium ${highlight ? 'text-cream/70' : danger ? 'text-red-700/80' : 'text-charcoal/55'}`}
      >
        {label}
      </p>
      <p
        className={`mt-1 truncate text-2xl font-bold tabular-nums ${highlight ? 'text-cream' : danger ? 'text-red-800' : 'text-charcoal'}`}
      >
        {value}
      </p>
      {sub && (
        <p
          className={`mt-1 truncate text-xs ${highlight ? 'text-cream/65' : danger ? 'text-red-700/70' : 'text-muted'}`}
        >
          {sub}
        </p>
      )}
    </div>
  )
}

function SettingsPanel({
  settings,
  trainers,
  averageSessionPrice,
  registeredPtTotalAmount,
  registeredPtTotalSessions,
  registeredMemberCount,
  onSave,
}: {
  settings: BusinessAnalyticsSettings
  trainers: Trainer[]
  averageSessionPrice: number
  registeredPtTotalAmount: number
  registeredPtTotalSessions: number
  registeredMemberCount: number
  onSave: (next: BusinessAnalyticsSettings) => Promise<void>
}) {
  const [draft, setDraft] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      await onSave(draft)
      setMessage('설정이 저장되었습니다.')
    } catch (err) {
      setMessage(formatSupabaseError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={`${cardClass} space-y-4 p-5`}>
      <div>
        <h3 className="text-sm font-semibold text-charcoal">경영 설정</h3>
        <p className="mt-1 text-xs text-muted">
          트레이너 정산율, 대표 트레이너, 고정비, 충당금 비율을 설정합니다. 평균 세션 단가는
          트레이너가 지정되고 PT 결제가 있는 등록 회원의 실제 결제 내역(총 결제 ÷ 총 세션)으로
          자동 계산됩니다.
        </p>
      </div>

      <div className="rounded-xl border border-gold/25 bg-cream/40 p-4 text-sm">
        <p className="font-semibold text-charcoal">평균 세션 단가 (자동)</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-charcoal">
          {formatCurrency(averageSessionPrice)}
        </p>
        <p className="mt-1 text-xs text-muted">
          트레이너 지정 + PT 결제 회원 {registeredMemberCount}명 · 총 결제{' '}
          {formatCurrency(registeredPtTotalAmount)} ÷ 총 세션{' '}
          {registeredPtTotalSessions.toLocaleString()}회
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">트레이너 수업료 비율 (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={draft.trainerSettlementRate}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                trainerSettlementRate: Number(e.target.value),
              }))
            }
            className={inputClass}
          />
          <p className="mt-1 text-xs text-muted">
            센터 기본 비율입니다. 트레이너별 개별 비율은 트레이너 메뉴에서 설정하며,
            출석부·경영분석 PT 정산에 함께 반영됩니다.
          </p>
        </label>

        <div className="rounded-xl border border-gold/20 bg-cream/30 px-4 py-3 text-sm text-muted">
          트레이너마다 다른 수업료 비율이 필요하면{' '}
          <a href="/admin/trainers" className="font-semibold text-charcoal underline">
            트레이너 → 수업료 비율
          </a>
          에서 개별 설정하세요.
        </div>

        <label className="block text-sm sm:col-span-2 lg:col-span-3">
          <span className="mb-1.5 block font-medium">대표 트레이너</span>
          <select
            value={draft.ownerTrainerId ?? ''}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                ownerTrainerId: e.target.value || null,
              }))
            }
            className={inputClass}
          >
            <option value="">선택 안 함</option>
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">세금 충당 (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={draft.taxReserveRate}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                taxReserveRate: Number(e.target.value),
              }))
            }
            className={inputClass}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">시설 충당 (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={draft.facilityReserveRate}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                facilityReserveRate: Number(e.target.value),
              }))
            }
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(
          [
            ['rent', '임대료'],
            ['maintenance', '관리비'],
            ['cardFee', '카드수수료'],
            ['telecom', '통신비'],
            ['other', '기타'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm">
            <span className="mb-1.5 block font-medium">{label}</span>
            <input
              type="number"
              min={0}
              step={10000}
              value={draft.fixedCosts[key]}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  fixedCosts: {
                    ...prev.fixedCosts,
                    [key]: Number(e.target.value),
                  },
                }))
              }
              className={inputClass}
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={btnPrimary}
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? '저장 중…' : '설정 저장'}
        </button>
        <button
          type="button"
          className={btnOutline}
          onClick={() => setDraft({ ...DEFAULT_BUSINESS_ANALYTICS_SETTINGS })}
        >
          기본값
        </button>
        <span className="text-sm text-muted">
          월 고정비 합계: {formatCurrency(sumFixedCosts(draft.fixedCosts))}
        </span>
        {message && <span className="text-sm text-charcoal">{message}</span>}
      </div>
    </section>
  )
}

export default function BusinessAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<BusinessAnalyticsTab>(() =>
    parseAnalyticsTab(searchParams.get('tab')),
  )
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<BusinessAnalyticsSnapshot | null>(null)
  const [settings, setSettings] = useState<BusinessAnalyticsSettings>(
    DEFAULT_BUSINESS_ANALYTICS_SETTINGS,
  )
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    setTab(parseAnalyticsTab(searchParams.get('tab')))
  }, [searchParams])

  function selectTab(next: BusinessAnalyticsTab) {
    setTab(next)
    setSearchParams({ tab: next }, { replace: true })
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [snapshot, nextSettings, trainerRows] = await Promise.all([
        fetchBusinessAnalytics(year, month),
        fetchBusinessAnalyticsSettings(),
        fetchTrainers(),
      ])
      setData(snapshot)
      setSettings(nextSettings)
      setTrainers(trainerRows)
      setError(null)
    } catch (err) {
      setError(formatSupabaseError(err))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    void load()
  }, [load])

  const monthOptions = useMemo(() => {
    const items: Array<{ year: number; month: number; label: string }> = []
    for (let offset = 0; offset < 12; offset += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
      items.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: `${d.getFullYear()}년 ${d.getMonth() + 1}월`,
      })
    }
    return items
  }, [now])

  const ownerRisk = (data?.ownerDependencyPercent ?? 0) > 50
  const refundRisk = (data?.totalRefundRisk ?? 0) > 5_000_000

  return (
    <div className="space-y-6">
      <PageHeader
        title="경영관리"
        description="AI 월간 경영 리포트로 이번 달 성과를 요약하고, 다음 달 실행할 액션을 제안합니다."
      />

      <nav className="chip-scroll -mx-1 px-1">
        {(Object.keys(TAB_LABELS) as BusinessAnalyticsTab[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={`chip ${tab === id ? 'chip-active' : 'chip-inactive'}`}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={`${year}-${month}`}
          onChange={(e) => {
            const [y, m] = e.target.value.split('-').map(Number)
            setYear(y)
            setMonth(m)
          }}
          className={inputClass}
        >
          {monthOptions.map((item) => (
            <option key={`${item.year}-${item.month}`} value={`${item.year}-${item.month}`}>
              {item.label}
            </option>
          ))}
        </select>
        <button type="button" className={btnOutline} onClick={() => setShowSettings((v) => !v)}>
          {showSettings ? '설정 닫기' : '경영 설정'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          trainers={trainers}
          averageSessionPrice={data?.averageSessionPrice ?? 0}
          registeredPtTotalAmount={data?.registeredPtTotalAmount ?? 0}
          registeredPtTotalSessions={data?.registeredPtTotalSessions ?? 0}
          registeredMemberCount={data?.registeredMemberCount ?? 0}
          onSave={async (next) => {
            await saveBusinessAnalyticsSettings(next)
            setSettings(next)
            await load()
          }}
        />
      )}

      {loading && (
        <section className={`${cardClass} p-6 text-sm text-muted`}>경영 데이터 불러오는 중…</section>
      )}

      {!loading && data && tab === 'report' && (
        <BusinessMonthlyReportPanel data={data} />
      )}

      {!loading && data && tab === 'dashboard' && (
        <>
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <KpiCard
              label={`${data.period.label} 실제 순이익`}
              value={formatCurrency(data.netProfit)}
              sub="인식매출 − 인건비 − 고정비 − 충당금"
              highlight
            />
            <div className={`${cardClass} flex items-center justify-between p-5`}>
              <div>
                <p className="text-xs font-medium text-muted">센터 건강도</p>
                <p className="mt-1 text-4xl font-bold text-charcoal">{data.healthGrade}</p>
                <p className="mt-1 text-sm text-muted">종합 점수 {data.healthScore}점</p>
              </div>
              <div className="text-right text-xs text-muted">
                <p>재등록·유지·환불·대표의존·고정비·PT비중</p>
                <p className="mt-1">5초 안에 경영 상태 파악</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-charcoal">1. 실매출 (인식매출)</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="이번 달 결제액"
                value={formatCurrency(data.cashRevenue)}
                sub={`신규 ${formatCurrency(data.cashRevenueNew)} · 재등록 ${formatCurrency(data.cashRevenueRenewal)}`}
              />
              <KpiCard
                label="회원권 인식매출"
                value={formatCurrency(data.centerPassRecognized)}
                sub="기간 균등 배분"
              />
              <KpiCard
                label="PT 인식매출"
                value={formatCurrency(data.ptRecognized)}
                sub="이번 달 소진 회차 기준"
              />
              <KpiCard
                label="총 인식매출"
                value={formatCurrency(data.totalRecognized)}
                sub="실제 매출"
                highlight
              />
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-charcoal">2. 선수금 현황</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <KpiCard label="회원권 선수금" value={formatCurrency(data.centerPassPrepaid)} />
                <KpiCard label="PT 선수금" value={formatCurrency(data.ptPrepaid)} />
                <KpiCard label="총 선수금" value={formatCurrency(data.totalPrepaid)} highlight />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-charcoal">3. 환불 리스크</h3>
              <p className="text-xs text-muted">
                PT 환불 가능 금액만 집계합니다. 결제일 + 등록횟수 ×{' '}
                {data.ptRefundDaysPerSession}일이 지난 잔여 회차는 제외됩니다.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <KpiCard
                  label="회원권 환불 가능"
                  value={formatCurrency(data.centerPassRefundRisk)}
                  sub={`기한 초과 ${formatCurrency(data.centerPassRefundExpired)}`}
                  danger={refundRisk}
                />
                <KpiCard
                  label="PT 환불 가능"
                  value={formatCurrency(data.ptRefundRisk)}
                  sub={`기한 초과 ${formatCurrency(data.ptRefundExpired)}`}
                  danger={refundRisk}
                />
                <KpiCard
                  label="총 환불 예상"
                  value={formatCurrency(data.totalRefundRisk)}
                  sub={`선수금 ${formatCurrency(data.totalPrepaid)} · 제외 ${formatCurrency(data.totalRefundExpired)}`}
                  danger={refundRisk}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-charcoal">4~8. 비용 · 충당</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="트레이너 지급액"
                value={formatCurrency(data.trainerPayroll)}
                sub={`PT 인식매출의 ${settings.trainerSettlementRate}%`}
              />
              <KpiCard
                label="센터 PT 몫"
                value={formatCurrency(data.centerPtShare)}
                sub="PT 인식매출 − 트레이너"
              />
              <KpiCard
                label="평균 세션 단가"
                value={formatCurrency(data.averageSessionPrice)}
                sub={`트레이너 지정 PT 회원 ${data.registeredMemberCount}명 · ${formatCurrency(data.registeredPtTotalAmount)} ÷ ${data.registeredPtTotalSessions.toLocaleString()}회`}
              />
              <KpiCard
                label="대표 인건비"
                value={formatCurrency(data.ownerPayroll)}
                sub={`이번 달 ${data.ownerSessions}회 × 평균 ${formatCurrency(data.averageSessionPrice)}`}
              />
              <KpiCard label="고정비" value={formatCurrency(data.fixedCostsTotal)} />
              <KpiCard
                label="세금 충당"
                value={formatCurrency(data.taxReserve)}
                sub={`인식매출의 ${settings.taxReserveRate}%`}
              />
              <KpiCard
                label="시설 충당"
                value={formatCurrency(data.facilityReserve)}
                sub={`인식매출의 ${settings.facilityReserveRate}%`}
              />
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className={`${cardClass} p-5`}>
              <h3 className="text-sm font-semibold text-charcoal">11. 대표 의존도</h3>
              <p className={`mt-3 text-3xl font-bold tabular-nums ${ownerRisk ? 'text-red-700' : 'text-emerald-700'}`}>
                {data.ownerDependencyPercent}%
              </p>
              <p className="mt-2 text-sm text-muted">
                {ownerRisk
                  ? '위험: 대표 매출 비중이 높습니다.'
                  : data.ownerDependencyPercent <= 30
                    ? '건강: 대표 의존도가 낮습니다.'
                    : '보통: 트레이너 매출 비중을 늘려보세요.'}
              </p>
            </div>

            <div className={`${cardClass} p-5`}>
              <h3 className="text-sm font-semibold text-charcoal">구조 지표</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">PT 의존도</dt>
                  <dd className="font-semibold tabular-nums">{data.ptDependencyPercent}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">고정비 비율</dt>
                  <dd className="font-semibold tabular-nums">{data.fixedCostRatioPercent}%</dd>
                </div>
              </dl>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
