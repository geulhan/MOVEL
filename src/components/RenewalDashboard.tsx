import type { RenewalFilter, RenewalStats } from '../utils/renewal'

type Props = {
  stats: RenewalStats
  activeFilter: RenewalFilter
  onFilterChange: (filter: RenewalFilter) => void
}

const cards: {
  key: keyof RenewalStats
  filter: RenewalFilter
  label: string
  desc: string
  accent: string
}[] = [
  {
    key: 'warningCount',
    filter: 'renewal',
    label: '재등록 주의',
    desc: 'PT 5회 이하',
    accent: 'border-yellow-400/50 bg-yellow-50/80',
  },
  {
    key: 'urgentCount',
    filter: 'urgent',
    label: '긴급 관리',
    desc: 'PT 3회 이하',
    accent: 'border-orange-400/50 bg-orange-50/80',
  },
  {
    key: 'expiringCount',
    filter: 'expiring',
    label: '만료 예정',
    desc: '7일 이내',
    accent: 'border-gold/60 bg-cream',
  },
  {
    key: 'terminatedCount',
    filter: 'terminated',
    label: '종료 회원',
    desc: '상태 종료',
    accent: 'border-charcoal/15 bg-charcoal/5',
  },
]

export function RenewalDashboard({
  stats,
  activeFilter,
  onFilterChange,
}: Props) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-charcoal">재등록 현황</h2>
      <p className="mt-0.5 text-xs text-muted">
        카드 클릭 시 해당 필터가 적용됩니다.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const isActive = activeFilter === card.filter

          return (
            <button
              key={card.key}
              type="button"
              onClick={() => onFilterChange(card.filter)}
              className={`card min-w-0 rounded-xl p-4 text-left transition hover:shadow-md ${
                card.accent
              } ${isActive ? 'ring-2 ring-gold ring-offset-2 ring-offset-cream' : ''}`}
            >
              <p className="truncate text-xs font-medium text-charcoal/60">
                {card.label}
              </p>
              <p className="stat-value">
                {stats[card.key]}
                <span className="ml-1 text-base font-semibold text-charcoal/50">
                  명
                </span>
              </p>
              <p className="mt-1 truncate text-xs text-muted">{card.desc}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
