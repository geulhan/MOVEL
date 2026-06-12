import { Link } from 'react-router-dom'

const LOGO_SRC = {
  'stacked-dark': '/logo/movel-stacked-dark.png',
  'stacked-light': '/logo/movel-stacked-light.png',
  'horizontal-light': '/logo/movel-horizontal-light.png',
} as const

export type MovelLogoVariant = 'stacked' | 'horizontal'
export type MovelLogoTheme = 'light' | 'dark'

type Props = {
  variant?: MovelLogoVariant
  /** light = white logo on dark backgrounds, dark = black logo on light backgrounds */
  theme?: MovelLogoTheme
  className?: string
  alt?: string
  linkTo?: string
}

function resolveSrc(variant: MovelLogoVariant, theme: MovelLogoTheme): string {
  if (variant === 'horizontal' && theme === 'light') {
    return LOGO_SRC['horizontal-light']
  }
  if (theme === 'light') return LOGO_SRC['stacked-light']
  return LOGO_SRC['stacked-dark']
}

export function MovelLogo({
  variant = 'stacked',
  theme = 'dark',
  className = 'h-12 w-auto',
  alt = 'MOVEL',
  linkTo,
}: Props) {
  const image = (
    <img
      src={resolveSrc(variant, theme)}
      alt={alt}
      className={className}
      decoding="async"
    />
  )

  if (linkTo) {
    return (
      <Link
        to={linkTo}
        className="inline-block opacity-95 transition hover:opacity-100"
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
