import { MOTIONHUB_BRAND, MOTIONHUB_BRAND_ASSETS } from '../../constants/motionhubBrand'

type Props = {
  className?: string
  /** light = 어두운 배경 위, dark = 밝은 배경 위 */
  tone?: 'light' | 'dark'
  showTagline?: boolean
  size?: 'nav' | 'header' | 'hero' | 'footer'
  /** combination: 가로, vertical: 세로, symbol: 아이콘만 */
  variant?: 'combination' | 'vertical' | 'symbol'
  /** 한글 로고 우선 (밝은 배경) */
  locale?: 'ko' | 'en'
}

function resolveSrc(
  tone: 'light' | 'dark',
  variant: 'combination' | 'vertical' | 'symbol',
  locale: 'ko' | 'en',
): string {
  if (variant === 'symbol') {
    return tone === 'light'
      ? MOTIONHUB_BRAND_ASSETS.iconDark
      : MOTIONHUB_BRAND_ASSETS.iconCyan
  }

  if (variant === 'vertical') {
    return tone === 'light'
      ? MOTIONHUB_BRAND_ASSETS.logoTransparent
      : MOTIONHUB_BRAND_ASSETS.logoVerticalLight
  }

  if (tone === 'light') {
    return MOTIONHUB_BRAND_ASSETS.logoTransparent
  }

  return locale === 'ko'
    ? MOTIONHUB_BRAND_ASSETS.logoKoLight
    : MOTIONHUB_BRAND_ASSETS.logoEnLight
}

export function MotionHubLogo({
  className = '',
  tone = 'light',
  showTagline = false,
  size = 'nav',
  variant = 'combination',
  locale = 'ko',
}: Props) {
  const isHero = size === 'hero'
  const isHeader = size === 'header'
  const isFooter = size === 'footer'
  const src = resolveSrc(tone, variant, locale)

  const sizeClass =
    variant === 'symbol'
      ? isHero
        ? 'h-16 w-16 sm:h-20 sm:w-20'
        : 'h-9 w-9 sm:h-10 sm:w-10'
      : variant === 'vertical'
        ? isHero
          ? 'h-auto w-auto max-h-52 max-w-[min(100%,16rem)] sm:max-h-60 sm:max-w-[18rem]'
          : isHeader
            ? 'h-auto w-auto max-h-[7.5rem] max-w-[10.5rem] sm:max-h-36 sm:max-w-[11.5rem]'
            : isFooter
              ? 'h-auto w-auto max-h-[4.5rem] max-w-[7.5rem] sm:max-h-20 sm:max-w-[8.5rem]'
              : 'h-auto w-auto max-h-10 max-w-[4.5rem] sm:max-h-11 sm:max-w-[5rem]'
        : isHero
          ? 'h-auto w-auto max-h-16 max-w-[min(100%,20rem)] sm:max-h-[4.5rem]'
          : 'h-9 w-auto max-w-[11rem] sm:h-10 sm:max-w-[12rem]'

  const imageHasTagline =
    variant !== 'symbol' &&
    (src === MOTIONHUB_BRAND_ASSETS.logoTransparent ||
      src === MOTIONHUB_BRAND_ASSETS.logoKoLight ||
      src === MOTIONHUB_BRAND_ASSETS.logoEnLight ||
      src === MOTIONHUB_BRAND_ASSETS.logoVerticalLight)

  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <img
        src={src}
        alt="모션허브 MotionHub"
        className={`object-contain ${variant === 'vertical' ? 'object-center' : 'object-left'} ${sizeClass}`}
        decoding="async"
      />
      {showTagline && !imageHasTagline && (
        <p
          className={`mt-1 text-[11px] font-medium leading-snug ${
            tone === 'light' ? 'text-white/55' : 'text-charcoal/45'
          }`}
        >
          {MOTIONHUB_BRAND.tagline}
        </p>
      )}
    </div>
  )
}
