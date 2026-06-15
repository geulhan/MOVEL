import type { ReactNode } from 'react'

type Props = {
  title: string
  hint?: string
  children: ReactNode
  className?: string
}

export function KpiSection({ title, hint, children, className = '' }: Props) {
  return (
    <div className={className}>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h3 className="text-xs font-semibold tracking-wide text-charcoal/65">
          {title}
        </h3>
        {hint ? <p className="text-[10px] text-muted">{hint}</p> : null}
      </div>
      {children}
    </div>
  )
}
