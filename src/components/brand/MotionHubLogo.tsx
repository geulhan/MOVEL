import {
  MOTIONHUB_BRAND,
  MOTIONHUB_BRAND_ASSETS,
} from '../../constants/motionhubBrand'

type Props = {
  className?: string
  tone?: 'light' | 'dark'
  showTagline?: boolean
  /** nav: 헤더·푸터, hero: 메인 타이틀 */
  size?: 'nav' | 'hero'
  /** false면 영문 (MotionHub) 병기 숨김 — 이미지 로고 사용 시 무시 */
  showEnglish?: boolean
  /** symbol만 표시 */
  variant?: 'combination' | 'symbol'
}

export function MotionHubLogo({
  className = '',
  tone = 'light',
  showTagline = false,
  size = 'nav',
  variant = 'combination',
}: Props) {
  const isHero = size === 'hero'
  const onDark = tone === 'light'

  if (variant === 'symbol') {
    const src = onDark
      ? MOTIONHUB_BRAND_ASSETS.symbolDark
      : MOTIONHUB_BRAND_ASSETS.symbolLight
    return (
      <img
        src={src}
        alt="모션허브"
        className={`object-contain ${isHero ? 'h-16 w-16 sm:h-20 sm:w-20' : 'h-8 w-8'} ${className}`}
        decoding="async"
      />
    )
  }

  const src = onDark
    ? MOTIONHUB_BRAND_ASSETS.combinationKoDark
    : MOTIONHUB_BRAND_ASSETS.combinationKoLight

  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <img
        src={src}
        alt="모션허브 MotionHub"
        className={`object-contain object-left ${
          isHero
            ? 'h-14 w-auto max-w-[min(100%,22rem)] sm:h-16'
            : 'h-9 w-auto max-w-[11rem] sm:h-10 sm:max-w-[12rem]'
        }`}
        decoding="async"
      />
      {showTagline && (
        <p
          className={`mt-1 text-[11px] font-medium leading-snug ${
            onDark ? 'text-cream/55' : 'text-charcoal/45'
          }`}
        >
          {MOTIONHUB_BRAND.tagline}
        </p>
      )}
    </div>
  )
}
