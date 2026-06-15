type Props = {
  className?: string
  tone?: 'light' | 'dark'
  showTagline?: boolean
  /** nav: 헤더·푸터, hero: 메인 타이틀 */
  size?: 'nav' | 'hero'
  /** false면 영문 (MotionHub) 병기 숨김 */
  showEnglish?: boolean
}

export function MotionHubLogo({
  className = '',
  tone = 'light',
  showTagline = false,
  size = 'nav',
  showEnglish = true,
}: Props) {
  const isLight = tone === 'light'
  const wordmark = isLight ? 'text-cream' : 'text-charcoal'
  const sub = isLight ? 'text-cream/55' : 'text-charcoal/50'
  const tagline = isLight ? 'text-cream/50' : 'text-charcoal/45'
  const isHero = size === 'hero'

  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <span
        className={`font-bold tracking-tight ${wordmark} ${
          isHero ? 'text-4xl sm:text-5xl lg:text-6xl' : 'text-xl sm:text-2xl'
        }`}
      >
        모션허브
        {showEnglish && !isHero && (
          <span className={`ml-1.5 text-sm font-semibold ${sub}`}>(MotionHub)</span>
        )}
      </span>
      {isHero && showEnglish && (
        <span className={`mt-2 text-base font-medium sm:text-lg ${sub}`}>
          MotionHub
        </span>
      )}
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
