import { useEffect, useId, useRef, useState } from 'react'

type Props = {
  text: string
}

export function PageHelpButton({ text }: Props) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const popoverId = useId()

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <span className="relative inline-flex shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-charcoal/20 bg-white text-sm font-bold text-charcoal/55 transition hover:border-gold/50 hover:bg-cream/80 hover:text-gold-dark"
        aria-label="도움말"
        aria-expanded={open}
        aria-controls={popoverId}
      >
        ?
      </button>
      {open && (
        <div
          ref={popoverRef}
          id={popoverId}
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-2 w-64 rounded-xl border border-charcoal/12 bg-white px-4 py-3 text-sm leading-relaxed text-charcoal shadow-lg sm:left-auto sm:right-0"
        >
          {text.split('\n').map((line, index) => (
            <span key={index}>
              {index > 0 && <br />}
              {line}
            </span>
          ))}
        </div>
      )}
    </span>
  )
}
