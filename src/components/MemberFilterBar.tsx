import type { RenewalFilter } from '../utils/renewal'

type Props = {
  active: RenewalFilter
  onChange: (filter: RenewalFilter) => void
  counts?: Partial<Record<RenewalFilter, number>>
}

const filters: { id: RenewalFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'active', label: '활성' },
  { id: 'renewal', label: '재등록' },
  { id: 'expiring', label: '만료 임박' },
  { id: 'terminated', label: '종료' },
]

export function MemberFilterBar({ active, onChange, counts }: Props) {
  return (
    <div className="chip-scroll">
      {filters.map((f) => {
        const count = counts?.[f.id]
        const label =
          count !== undefined ? `${f.label} ${count}` : f.label
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={`chip ${active === f.id ? 'chip-active' : 'chip-inactive'}`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
