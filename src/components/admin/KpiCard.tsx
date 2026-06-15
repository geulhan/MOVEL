type Props = {
  label: string
  value: string | number
  sub?: string
  onClick?: () => void
  accent?: string
  size?: 'sm' | 'md' | 'lg'
  highlight?: boolean
  className?: string
}

const padBySize = {
  sm: 'p-3.5',
  md: 'p-4',
  lg: 'p-4 sm:p-5',
} as const

const valueBySize = {
  sm: 'text-xl sm:text-2xl',
  md: 'text-2xl sm:text-[1.65rem]',
  lg: 'text-2xl sm:text-3xl',
} as const

export function KpiCard({
  label,
  value,
  sub,
  onClick,
  accent,
  size = 'md',
  highlight = false,
  className = '',
}: Props) {
  const baseClass = [
    'card min-w-0 text-left transition',
    'flex min-h-[5.5rem] flex-col justify-center',
    padBySize[size],
    highlight ? 'border-gold/55 bg-cream/50 ring-1 ring-gold/20' : '',
    accent ?? '',
    onClick ? 'cursor-pointer hover:border-gold/60 hover:shadow-md' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      <p className="truncate text-[11px] font-medium text-charcoal/55 sm:text-xs">
        {label}
      </p>
      <p
        className={`mt-0.5 truncate font-bold tracking-tight text-charcoal tabular-nums ${valueBySize[size]}`}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted sm:text-xs">
          {sub}
        </p>
      ) : (
        <span className="mt-1 block min-h-[1rem]" aria-hidden />
      )}
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClass}>
        {content}
      </button>
    )
  }

  return <div className={baseClass}>{content}</div>
}
