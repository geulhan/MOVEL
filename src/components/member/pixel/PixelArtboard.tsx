import type { ReactNode } from 'react'
import { ARTBOARD_SIZE } from './pixelTypes'

type Props = {
  className?: string
  children?: ReactNode
  onClick?: (coords: { x: number; y: number }) => void
  ariaLabel?: string
}

export function PixelArtboard({
  className = '',
  children,
  onClick,
  ariaLabel = '픽셀 아트 씬',
}: Props) {
  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onClick) return
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const scale = ARTBOARD_SIZE / rect.width
    const x = Math.round((e.clientX - rect.left) * scale)
    const y = Math.round((e.clientY - rect.top) * scale)
    onClick({ x, y })
  }

  return (
    <svg
      viewBox={`0 0 ${ARTBOARD_SIZE} ${ARTBOARD_SIZE}`}
      className={`aspect-square w-full max-w-lg select-none ${className}`}
      role="img"
      aria-label={ariaLabel}
      onClick={handleClick}
      style={{ imageRendering: 'pixelated' }}
    >
      {children}
    </svg>
  )
}

export function PixelRects({
  rects,
}: {
  rects: Array<{ x: number; y: number; width: number; height: number; fill: string }>
}) {
  return (
    <>
      {rects.map((cell, i) => (
        <rect
          key={`${cell.x}-${cell.y}-${i}`}
          x={cell.x}
          y={cell.y}
          width={cell.width}
          height={cell.height}
          fill={cell.fill}
        />
      ))}
    </>
  )
}
