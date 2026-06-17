type KpiItem = {
  label: string
  value: string | number
  sub?: string
}

export function PlatformKpiGrid({
  items,
  columns = 2,
}: {
  items: KpiItem[]
  columns?: 2 | 3 | 4
}) {
  const gridClass =
    columns === 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : columns === 3
        ? 'sm:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-2'

  return (
    <div className={`grid gap-3 ${gridClass}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-white/10 bg-[#161d26] px-4 py-3"
        >
          <p className="text-xs text-cream/50">{item.label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">
            {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
          </p>
          {item.sub && <p className="mt-1 text-[11px] text-cream/45">{item.sub}</p>}
        </div>
      ))}
    </div>
  )
}

export function PlatformSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {description && <p className="mt-1 text-sm text-cream/55">{description}</p>}
      </div>
      {children}
    </section>
  )
}

export function PlatformRankList({
  title,
  unit,
  items,
  formatValue,
}: {
  title: string
  unit?: string
  items: Array<{ name: string; slug: string; value: number }>
  formatValue?: (value: number) => string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#161d26] p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-cream/50">데이터 없음</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {items.map((item, index) => (
            <li
              key={`${item.slug}-${index}`}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="min-w-0 truncate text-cream/85">
                <span className="mr-2 text-xs text-cream/40">{index + 1}</span>
                {item.name}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-emerald-300">
                {formatValue ? formatValue(item.value) : `${item.value.toLocaleString()}${unit ?? ''}`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function formatKrw(amount: number): string {
  return `${amount.toLocaleString()}원`
}
