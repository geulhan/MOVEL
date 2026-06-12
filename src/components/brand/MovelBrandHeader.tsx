import { MovelBrandSubtitle, MovelLogo } from './MovelLogo'

type Props = {
  /** dark band behind a light logo, or plain on cream */
  band?: 'dark' | 'plain'
  variant?: 'stacked' | 'horizontal'
  size?: 'sm' | 'md' | 'lg'
  linkTo?: string
  subtitle?: boolean
  className?: string
}

const HEIGHT = {
  sm: 'h-10 w-auto',
  md: 'h-14 w-auto',
  lg: 'h-20 w-auto',
} as const

export function MovelBrandHeader({
  band = 'plain',
  variant = 'stacked',
  size = 'md',
  linkTo,
  subtitle = true,
  className = '',
}: Props) {
  const isDarkBand = band === 'dark'

  return (
    <div
      className={`text-center ${isDarkBand ? 'border-b border-gold/15 bg-charcoal px-4 py-8' : ''} ${className}`}
    >
      <MovelLogo
        variant={variant}
        theme={isDarkBand ? 'light' : 'dark'}
        className={`mx-auto ${HEIGHT[size]}`}
        linkTo={linkTo}
      />
      {subtitle && (
        <MovelBrandSubtitle
          tone={isDarkBand ? 'light' : 'gold'}
          className="mt-3"
        />
      )}
    </div>
  )
}
