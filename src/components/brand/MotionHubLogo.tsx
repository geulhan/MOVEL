type Props = {
  className?: string
  tone?: 'light' | 'dark'
  showTagline?: boolean
}

export function MotionHubLogo({
  className = '',
  tone = 'light',
  showTagline = false,
}: Props) {
  const isLight = tone === 'light'
  const wordmark = isLight ? 'text-cream' : 'text-charcoal'
  const hub = isLight ? 'text-teal-300' : 'text-teal-600'
  const tagline = isLight ? 'text-cream/50' : 'text-charcoal/45'

  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <span className={`text-xl font-bold tracking-tight sm:text-2xl ${wordmark}`}>
        Motion<span className={hub}>Hub</span>
      </span>
      {showTagline && (
        <span
          className={`mt-0.5 text-[10px] font-semibold tracking-[0.2em] uppercase ${tagline}`}
        >
          Fitness Center OS
        </span>
      )}
    </div>
  )
}
