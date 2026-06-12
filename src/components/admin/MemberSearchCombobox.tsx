import { useEffect, useId, useRef, useState } from 'react'
import { formatPhone } from '../../api/members'
import { inputClass } from '../../styles/theme'
import { MEMBER_STATUS_LABELS, type Member } from '../../types/database'

const MAX_SUGGESTIONS = 10

type Props = {
  value: string
  suggestions: Member[]
  loading?: boolean
  onChange: (value: string) => void
  onSelect: (member: Member) => void
  onClear?: () => void
}

export function MemberSearchCombobox({
  value,
  suggestions,
  loading = false,
  onChange,
  onSelect,
  onClear,
}: Props) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)

  const trimmed = value.trim()
  const visible = suggestions.slice(0, MAX_SUGGESTIONS)
  const overflowCount = Math.max(0, suggestions.length - MAX_SUGGESTIONS)
  const showDropdown = open && trimmed.length > 0

  useEffect(() => {
    setHighlightIndex(0)
  }, [value, suggestions.length])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  function pick(member: Member) {
    onSelect(member)
    setOpen(false)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      if (visible.length > 0) {
        setHighlightIndex((index) => (index + 1) % visible.length)
      }
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      if (visible.length > 0) {
        setHighlightIndex(
          (index) => (index - 1 + visible.length) % visible.length,
        )
      }
      return
    }

    if (event.key === 'Enter') {
      if (showDropdown && visible[highlightIndex]) {
        event.preventDefault()
        pick(visible[highlightIndex])
      }
      return
    }

    if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="flex gap-2">
        <input
          type="search"
          lang="ko"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (trimmed) setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder="이름·전화번호 검색 (예: 김, 이)"
          className={`${inputClass} flex-1`}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('')
              onClear?.()
              setOpen(false)
            }}
            className="shrink-0 rounded-lg border border-gold/40 px-3 text-sm text-muted transition hover:bg-cream"
          >
            지우기
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-gold/30 bg-white py-1 shadow-lg"
        >
          {loading && visible.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">검색 중…</p>
          ) : visible.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">
              「{trimmed}」에 맞는 회원이 없습니다.
            </p>
          ) : (
            <>
              {visible.map((member, index) => (
                <button
                  key={member.id}
                  type="button"
                  role="option"
                  aria-selected={index === highlightIndex}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => pick(member)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition ${
                    index === highlightIndex
                      ? 'bg-gold/15 text-charcoal'
                      : 'text-charcoal hover:bg-cream/70'
                  }`}
                >
                  <span>
                    <span className="font-semibold">{member.name}</span>
                    <span className="ml-2 text-xs text-muted">
                      {formatPhone(member.phone)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {member.trainer_name ?? '트레이너 미지정'} ·{' '}
                    {MEMBER_STATUS_LABELS[member.status]}
                  </span>
                </button>
              ))}
              {overflowCount > 0 && (
                <p className="border-t border-gold/15 px-4 py-2 text-xs text-muted">
                  외 {overflowCount}명 · 아래 목록에서 더 볼 수 있습니다.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
