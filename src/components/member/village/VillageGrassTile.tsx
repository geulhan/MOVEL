type Props = {
  x: number
  y: number
  kind?: 'grass' | 'plaza'
  className?: string
}

const GRASS_SHADES = ['#7fbf6e', '#76b566', '#6fad5d', '#84c275'] as const

export function VillageGrassTile({ x, y, kind = 'grass', className = '' }: Props) {
  if (kind === 'plaza') {
    return (
      <div
        className={`relative overflow-hidden ${className}`}
        style={{
          background:
            'radial-gradient(circle at 50% 42%, #f0e6d4 0%, #dcc9ad 38%, #c9b08f 72%, #b39a78 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-[18%] rounded-full border border-[#a89070]/35"
          style={{
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.12) 3px, rgba(255,255,255,0.12) 4px)',
          }}
        />
      </div>
    )
  }

  const shade = GRASS_SHADES[(x + y * 3) % GRASS_SHADES.length]
  const highlight = (x * 7 + y * 11) % 5 === 0

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(165deg, ${shade} 0%, ${adjust(shade, -12)} 100%)`,
      }}
    >
      {highlight && (
        <span
          className="pointer-events-none absolute left-[38%] top-[28%] size-1 rounded-full bg-[#d8f0c8]/70"
          aria-hidden
        />
      )}
      {(x + y) % 4 === 0 && (
        <span
          className="pointer-events-none absolute bottom-[22%] right-[30%] size-0.5 rounded-full bg-[#4a7c3f]/25"
          aria-hidden
        />
      )}
    </div>
  )
}

function adjust(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + amount))
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount))
  const b = Math.max(0, Math.min(255, (n & 0xff) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
