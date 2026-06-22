import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

export function LandingContainer({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  )
}

export function SectionEyebrow({
  children,
  light = false,
  centered = false,
}: {
  children: ReactNode
  light?: boolean
  centered?: boolean
}) {
  return (
    <p
      className={`landing-eyebrow ${
        light ? 'text-motionhub' : 'text-motionhub-dark'
      } ${centered ? 'text-center' : ''}`}
    >
      {children}
    </p>
  )
}

export function SectionTitle({
  children,
  light = false,
  centered = false,
  className = '',
}: {
  children: ReactNode
  light?: boolean
  centered?: boolean
  className?: string
}) {
  return (
    <h2
      className={`mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-tight ${
        light ? 'text-cream' : 'text-charcoal'
      } ${centered ? 'mx-auto text-center' : ''} ${className}`}
    >
      {children}
    </h2>
  )
}

export function SectionLead({
  children,
  light = false,
  centered = false,
}: {
  children: ReactNode
  light?: boolean
  centered?: boolean
}) {
  return (
    <p
      className={`mt-4 max-w-2xl text-base leading-relaxed sm:text-lg ${
        light ? 'text-cream/70' : 'text-charcoal/60'
      } ${centered ? 'mx-auto text-center' : ''}`}
    >
      {children}
    </p>
  )
}

export function LandingCard({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`landing-card ${className}`}>{children}</div>
  )
}

type BtnProps = {
  children: ReactNode
  className?: string
  onClick?: () => void
  href?: string
  to?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  external?: boolean
}

export function PrimaryButton({
  children,
  className = '',
  onClick,
  href,
  to,
  type = 'button',
  disabled,
  external,
}: BtnProps) {
  const cls = `landing-btn-primary ${className}`
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    )
  }
  if (href) {
    return (
      <a
        href={href}
        className={cls}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    )
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  )
}

export function SecondaryButton({
  children,
  className = '',
  onClick,
  href,
  to,
  type = 'button',
  disabled,
  external,
}: BtnProps) {
  const cls = `landing-btn-secondary ${className}`
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    )
  }
  if (href) {
    return (
      <a
        href={href}
        className={cls}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    )
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  className = '',
  onClick,
  href,
  to,
}: BtnProps) {
  const cls = `landing-btn-ghost ${className}`
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  )
}

export function FeatureIcon({
  children,
  inline = false,
}: {
  children: ReactNode
  inline?: boolean
}) {
  return (
    <span
      className={inline ? 'landing-feature-icon-inline' : 'landing-feature-icon'}
      aria-hidden
    >
      {children}
    </span>
  )
}
