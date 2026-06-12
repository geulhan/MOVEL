type Props = {
  fill: string
  variant: 'stacked' | 'horizontal'
  className?: string
}

/** Transparent vector logo — matches MOVEL brand mark */
export function MovelLogoSvg({ fill, variant, className = '' }: Props) {
  if (variant === 'horizontal') {
    return (
      <svg
        viewBox="0 0 220 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden
      >
        <g stroke={fill} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="24,4 40,12 40,28 24,36 8,28 8,12" />
          <path d="M13.5 28V15.5L19.5 22 25.5 15.5V28" />
          <path d="M28.5 15.5V28" />
        </g>
        <text
          x="52"
          y="31"
          fill={fill}
          fontSize="18"
          fontFamily="'Pretendard', 'Apple SD Gothic Neo', system-ui, sans-serif"
          fontWeight="500"
          letterSpacing="0.42em"
        >
          MOVEL
        </text>
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 120 108"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <g stroke={fill} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="60,6 96,26 96,66 60,86 24,66 24,26" />
        <path d="M37 66V37l14 16 14-16v29" />
        <path d="M73 37v29" />
      </g>
      <text
        x="60"
        y="102"
        fill={fill}
        fontSize="15"
        textAnchor="middle"
        fontFamily="'Pretendard', 'Apple SD Gothic Neo', system-ui, sans-serif"
        fontWeight="500"
        letterSpacing="0.38em"
      >
        MOVEL
      </text>
    </svg>
  )
}
