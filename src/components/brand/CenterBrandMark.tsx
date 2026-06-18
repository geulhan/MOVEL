import { Link } from 'react-router-dom'
import type { CenterBranding } from '../../types/centerBranding'
import { MotionHubLogo } from './MotionHubLogo'

type Props = {
  branding: CenterBranding
  variant?: 'sidebar' | 'mobile'
  linkTo?: string
}

export function CenterBrandMark({
  branding,
  variant = 'sidebar',
  linkTo = '/admin',
}: Props) {
  const isMobile = variant === 'mobile'

  const content = branding.logoUrl ? (
    <img
      key={branding.logoUrl}
      src={branding.logoUrl}
      alt={`${branding.centerName} 로고`}
      className={
        isMobile
          ? 'h-8 max-w-[10rem] object-contain object-left'
          : 'h-16 max-w-[13rem] object-contain object-left'
      }
      decoding="async"
    />
  ) : (
    <div className={isMobile ? 'max-w-[10rem]' : 'max-w-[13rem]'}>
      <p
        className={`font-bold leading-tight tracking-tight ${
          isMobile ? 'text-sm' : 'text-base'
        }`}
        style={{ color: 'var(--center-sidebar-text)' }}
      >
        {branding.centerName}
      </p>
      <div className="mt-2 flex items-center gap-1.5 opacity-70">
        <MotionHubLogo tone="light" variant="symbol" className="!h-4 !w-4" />
        <span
          className="text-[10px] font-medium"
          style={{ color: 'var(--center-sidebar-muted)' }}
        >
          모션허브
        </span>
      </div>
    </div>
  )

  if (linkTo) {
    return (
      <Link to={linkTo} className="inline-block transition hover:opacity-90">
        {content}
      </Link>
    )
  }

  return content
}
