import { Link } from 'react-router-dom'

/** Transparent PNG — color applied via CSS filter */
const LOGO_SRC = '/logo/movel-stacked-dark.png'

export type MovelLogoTone = 'charcoal' | 'cream' | 'gold'

type Props = {
  /** charcoal on cream/white, cream or gold on charcoal */
  tone?: MovelLogoTone
  className?: string
  alt?: string
  linkTo?: string
}

const TONE_CLASS: Record<MovelLogoTone, string> = {
  charcoal: 'logo-tone-charcoal',
  cream: 'logo-tone-cream',
  gold: 'logo-tone-gold',
}

export function MovelLogo({
  tone = 'charcoal',
  className = 'h-12 w-auto',
  alt = 'MOVEL',
  linkTo,
}: Props) {
  const image = (
    <img
      src={LOGO_SRC}
      alt={alt}
      className={`${TONE_CLASS[tone]} ${className}`}
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
