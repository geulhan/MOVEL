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

const NAV_ITEMS: { id: TabId; label: string }[] = [
  { id: 'schedule', label: '수업 일정' },
  { id: 'journal', label: '운동 일지' },
  { id: 'inbody', label: '인바디' },
  { id: 'payment', label: '결제' },
  { id: 'growth', label: '성장 허브' },
  { id: 'rewards', label: '리워드' },
  { id: 'mypage', label: '마이페이지' },
]

export function MemberPortalNav({
  activeTab,
  onSelect,
  showGrowthHub = false,
}: Props) {
  const items = NAV_ITEMS.filter(
    (item) => item.id !== 'growth' || showGrowthHub,
  )

  return (
    <nav
      aria-label="회원 메뉴"
      className="member-portal-nav"
    >
      {items.map((item) => {
        const isActive = activeTab === item.id

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`member-portal-nav-item ${isActive ? 'is-active' : ''}`}
          >
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
