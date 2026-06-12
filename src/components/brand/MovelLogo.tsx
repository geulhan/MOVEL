import { Link } from 'react-router-dom'

const LOGO_SRC = {
  'stacked-dark': '/logo/movel-stacked-dark.png',
  'stacked-light': '/logo/movel-stacked-light.png',
  'horizontal-dark': '/logo/movel-horizontal-dark.png',
  'horizontal-light': '/logo/movel-horizontal-light.png',
} as const

export type MovelLogoVariant = 'stacked' | 'horizontal'
export type MovelLogoTone = 'charcoal' | 'cream'

type Props = {
  variant?: MovelLogoVariant
  /** charcoal = black logo on cream/white, cream = white logo on charcoal */
  tone?: MovelLogoTone
  className?: string
  alt?: string
  linkTo?: string
}

function resolveSrc(variant: MovelLogoVariant, tone: MovelLogoTone): string {
  if (variant === 'horizontal') {
    return tone === 'cream'
      ? LOGO_SRC['horizontal-light']
      : LOGO_SRC['horizontal-dark']
  }
  return tone === 'cream' ? LOGO_SRC['stacked-light'] : LOGO_SRC['stacked-dark']
}

export function MovelLogo({
  variant = 'stacked',
  tone = 'charcoal',
  className = 'h-12 w-auto',
  alt = 'MOVEL',
  linkTo,
}: Props) {
  const image = (
    <img
      src={resolveSrc(variant, tone)}
      alt={alt}
      className={`${tone === 'cream' ? 'mix-blend-screen' : ''} ${className}`.trim()}
      decoding="async"
    />
  )

  if (linkTo) {
    return (
      <Link
        to={linkTo}
        className="inline-block transition hover:opacity-90"
        aria-label="MOVEL 홈"
      >
        {image}
      </Link>
    )
  }

  return image
}

export function MovelBrandSubtitle({
  className = '',
  tone = 'muted',
}: {
  className?: string
  tone?: 'light' | 'muted' | 'gold'
}) {
  const toneClass =
    tone === 'light'
      ? 'text-cream/55'
      : tone === 'gold'
        ? 'text-gold'
        : 'text-muted'

  return (
    <p
      className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${toneClass} ${className}`}
    >
      Performance Training
    </p>
  )
}
