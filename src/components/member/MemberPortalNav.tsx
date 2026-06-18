type TabId =
  | 'schedule'
  | 'journal'
  | 'inbody'
  | 'payment'
  | 'growth'
  | 'rewards'
  | 'mypage'

type Props = {
  activeTab: TabId | null
  onSelect: (tab: TabId) => void
  showGrowthHub?: boolean
}

const NAV_ITEMS: { id: TabId; lines: string[] }[] = [
  { id: 'schedule', lines: ['수업', '일정'] },
  { id: 'journal', lines: ['운동', '일지'] },
  { id: 'inbody', lines: ['인바디'] },
  { id: 'payment', lines: ['결제'] },
  { id: 'growth', lines: ['성장', '허브'] },
  { id: 'rewards', lines: ['리워드'] },
  { id: 'mypage', lines: ['마이', '페이지'] },
]

export function MemberPortalNav({
  activeTab,
  onSelect,
  showGrowthHub = false,
}: Props) {
  const items = NAV_ITEMS.filter(
    (item) => item.id !== 'growth' || showGrowthHub,
  )
  const colClass =
    items.length === 7
      ? 'grid-cols-7'
      : items.length === 6
        ? 'grid-cols-6'
        : 'grid-cols-5'

  return (
    <nav
      aria-label="회원 메뉴"
      className={`grid ${colClass} gap-1 rounded-2xl border border-gold/20 bg-white p-1.5 shadow-sm`}
    >
      {items.map((item) => {
        const isActive = activeTab === item.id
        const isGrowth = item.id === 'growth'
        const isRewards = item.id === 'rewards'

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex aspect-square w-full min-h-[3.75rem] flex-col items-center justify-center rounded-xl px-0.5 py-1.5 transition ${
              isActive
                ? 'bg-charcoal text-cream shadow-sm'
                : 'text-charcoal hover:bg-cream/80'
            }`}
          >
            {item.lines.map((line) => (
              <span
                key={line}
                className={`text-center leading-tight font-bold ${
                  isGrowth || isRewards
                    ? 'text-[10px] tracking-tight'
                    : 'text-xs tracking-tight'
                } ${isActive ? 'text-cream' : 'text-charcoal'}`}
              >
                {line}
              </span>
            ))}
          </button>
        )
      })}
    </nav>
  )
}
