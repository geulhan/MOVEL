import { btnGold, inputClass } from '../styles/theme'

type Props = {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
}

export function SearchBar({ value, onChange, onSearch }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        type="search"
        lang="ko"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        placeholder="이름, 전화번호, 트레이너로 검색"
        className={`${inputClass} flex-1`}
      />
      <button type="button" onClick={onSearch} className={btnGold}>
        검색
      </button>
    </div>
  )
}
