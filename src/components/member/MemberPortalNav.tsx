type TabId =
  | 'schedule'
  | 'journal'
  | 'inbody'
  | 'payment'
  | 'rewards'
  | 'mypage'

type Props = {
  activeTab: TabId | null
  onSelect: (tab: TabId) => void
}

const NAV_ITEMS: { id: TabId; top: string; bottom: string | null }[] = [
  { id: 'schedule', top: '수업', bottom: '일정' },
  { id: 'journal', top: '운동', bottom: '일지' },
  { id: 'inbody', top: '인바디', bottom: null },
  { id: 'payment', top: '결제', bottom: null },
  { id: 'rewards', top: 'REWARDS', bottom: null },
  { id: 'mypage', top: '마이', bottom: '페이지' },
]

export function MemberPortalNav({ activeTab, onSelect }: Props) {
  return (
    <nav
      aria-label="회원 메뉴"
      className="grid grid-cols-6 gap-0.5 rounded-2xl border border-gold/20 bg-white p-1 shadow-sm"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex min-h-[3.375rem] flex-col items-center justify-center rounded-xl px-0.5 py-2 transition ${
              isActive
                ? 'bg-charcoal text-cream shadow-sm'
                : 'text-charcoal hover:bg-cream/80'
            }`}
          >
            <span
              className={`flex h-4 w-full items-center justify-center px-0.5 text-center text-[11px] leading-none font-bold tracking-tight ${
                isActive ? 'text-cream' : 'text-charcoal'
              } ${item.id === 'rewards' ? 'text-[10px] tracking-wide' : ''}`}
            >
              {item.top}
            </span>
            <span
              className={`flex h-3.5 w-full items-center justify-center text-center text-[10px] leading-none ${
                item.bottom
                  ? isActive
                    ? 'font-medium text-cream/80'
                    : 'font-medium text-charcoal/45'
                  : 'text-transparent'
              }`}
              aria-hidden={!item.bottom}
            >
              {item.bottom ?? '·'}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
