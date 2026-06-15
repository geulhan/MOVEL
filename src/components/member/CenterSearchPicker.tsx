import { useEffect, useMemo, useRef, useState } from 'react'
import type { SignupCenterOption } from '../../api/centerPublic'
import { inputClass } from '../../styles/theme'

type Props = {
  centers: SignupCenterOption[]
  loading: boolean
  selectedSlug: string
  onSelect: (slug: string) => void
  disabled?: boolean
}

export function CenterSearchPicker({
  centers,
  loading,
  selectedSlug,
  onSelect,
  disabled = false,
}: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const selectedCenter = useMemo(
    () => centers.find((center) => center.centerSlug === selectedSlug) ?? null,
    [centers, selectedSlug],
  )

  useEffect(() => {
    if (selectedCenter) {
      setQuery(selectedCenter.centerName)
    }
  }, [selectedCenter?.centerId, selectedCenter?.centerName])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return centers.slice(0, 12)
    return centers
      .filter(
        (center) =>
          center.centerName.toLowerCase().includes(term) ||
          center.centerSlug.toLowerCase().includes(term),
      )
      .slice(0, 12)
  }, [centers, query])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  function handleSelect(center: SignupCenterOption) {
    onSelect(center.centerSlug)
    setQuery(center.centerName)
    setOpen(false)
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    setOpen(true)
    if (!value.trim()) {
      onSelect('')
    } else if (selectedCenter && value !== selectedCenter.centerName) {
      onSelect('')
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">센터 검색</span>
        <input
          type="search"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={loading ? '센터 목록 불러오는 중…' : '센터명을 입력하세요'}
          className={inputClass}
          disabled={disabled || loading}
          autoComplete="off"
        />
      </label>

      {open && !loading && query.trim() && filtered.length > 0 && (
        <ul
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-charcoal/10 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {filtered.map((center) => (
            <li key={center.centerId}>
              <button
                type="button"
                role="option"
                aria-selected={center.centerSlug === selectedSlug}
                onClick={() => handleSelect(center)}
                className={`block w-full px-3 py-2.5 text-left text-sm transition hover:bg-cream/80 ${
                  center.centerSlug === selectedSlug ? 'bg-cream/60 font-semibold' : ''
                }`}
              >
                {center.centerName}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && query.trim() && filtered.length === 0 && (
        <p className="absolute z-20 mt-1 w-full rounded-xl border border-charcoal/10 bg-white px-3 py-2.5 text-sm text-muted shadow-lg">
          검색 결과가 없습니다.
        </p>
      )}

      {selectedCenter && (
        <p className="mt-1.5 text-xs text-teal-800">
          선택됨: <strong>{selectedCenter.centerName}</strong>
        </p>
      )}

      {!loading && centers.length === 0 && (
        <p className="mt-1 text-xs text-amber-800">
          현재 가입 가능한 센터가 없습니다. 센터에 문의해 주세요.
        </p>
      )}
    </div>
  )
}
