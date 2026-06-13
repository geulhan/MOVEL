type Props = {
  label: string
  value: string | number
  sub?: string
  onClick?: () => void
  accent?: string
}

export function KpiCard({ label, value, sub, onClick, accent }: Props) {
  const className = `card min-w-0 card-pad text-left transition ${
    accent ?? ''
  } ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`

  const content = (
    <>
      <p className="truncate text-xs font-medium text-charcoal/55">{label}</p>
      <p className="stat-value truncate">{value}</p>
      {sub ? (
        <p className="mt-1 truncate text-xs text-muted">{sub}</p>
      ) : null}
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    )
  }

  return <div className={className}>{content}</div>
}
