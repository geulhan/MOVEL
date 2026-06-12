import { Link } from 'react-router-dom'
import { MovelLogoSvg } from './MovelLogoSvg'

const LOGO_SRC = {
  'stacked-light': '/logo/movel-stacked-light.png',
  'horizontal-light': '/logo/movel-horizontal-light.png',
} as const

export type MovelLogoVariant = 'stacked' | 'horizontal'
export type MovelLogoTone = 'charcoal' | 'cream'

const FILL = {
  charcoal: '#1c1c1c',
  cream: '#f5f0e8',
} as const

type Props = {
  variant?: MovelLogoVariant
  /** charcoal = dark logo on cream/white, cream = light logo on charcoal */
  tone?: MovelLogoTone
  className?: string
  alt?: string
  linkTo?: string
}

export function MovelLogo({
  variant = 'stacked',
  tone = 'charcoal',
  className = 'h-12 w-auto',
  alt = 'MOVEL',
  linkTo,
}: Props) {
  const content =
    tone === 'charcoal' ? (
      <MovelLogoSvg
        variant={variant}
        fill={FILL.charcoal}
        className={className}
      />
    ) : (
      <img
        src={
          variant === 'horizontal'
            ? LOGO_SRC['horizontal-light']
            : LOGO_SRC['stacked-light']
        }
        alt={alt}
        className={`mix-blend-screen ${className}`.trim()}
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
        {content}
      </Link>
    )
  }

  return content
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
