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

const NAV_ITEMS: { id: TabId; lines: string[] }[] = [
  { id: 'schedule', lines: ['수업', '일정'] },
  { id: 'journal', lines: ['운동', '일지'] },
  { id: 'inbody', lines: ['인바디'] },
  { id: 'payment', lines: ['결제'] },
  { id: 'rewards', lines: ['REWARDS'] },
  { id: 'mypage', lines: ['마이', '페이지'] },
]

export function MemberPortalNav({ activeTab, onSelect }: Props) {
  return (
    <nav
      aria-label="회원 메뉴"
      className="grid grid-cols-6 gap-1 rounded-2xl border border-gold/20 bg-white p-1.5 shadow-sm"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.id
        const isRewards = item.id === 'rewards'

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex aspect-square w-full min-h-[4.25rem] flex-col items-center justify-center rounded-xl px-1 py-2 transition ${
              isActive
                ? 'bg-charcoal text-cream shadow-sm'
                : 'text-charcoal hover:bg-cream/80'
            }`}
          >
            {item.lines.map((line) => (
              <span
                key={line}
                className={`text-center leading-tight font-bold ${
                  isRewards
                    ? 'text-[11px] tracking-wide'
                    : 'text-sm tracking-tight'
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
