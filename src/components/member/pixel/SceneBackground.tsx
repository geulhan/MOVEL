import { ARTBOARD_SIZE } from './pixelTypes'

/** 하늘·지형 그라데이션 + 부드러운 구름 */
export function SceneBackground() {
  const cx = ARTBOARD_SIZE / 2

  return (
    <>
      <defs>
        <linearGradient id="mh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7ec8e8" />
          <stop offset="38%" stopColor="#b8dff0" />
          <stop offset="62%" stopColor="#c8e8b0" />
          <stop offset="100%" stopColor="#5a9e52" />
        </linearGradient>
        <radialGradient id="mh-meadow" cx="50%" cy="58%" r="62%">
          <stop offset="0%" stopColor="#8ecf7a" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#6bab5e" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3d6b38" stopOpacity="0.2" />
        </radialGradient>
        <radialGradient id="mh-vignette" cx="50%" cy="50%" r="72%">
          <stop offset="55%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#1a3d1a" stopOpacity="0.35" />
        </radialGradient>
      </defs>

      <rect width={ARTBOARD_SIZE} height={ARTBOARD_SIZE} fill="url(#mh-sky)" />
      <rect width={ARTBOARD_SIZE} height={ARTBOARD_SIZE} fill="url(#mh-meadow)" />
      <rect width={ARTBOARD_SIZE} height={ARTBOARD_SIZE} fill="url(#mh-vignette)" />

      <ellipse cx="220" cy="130" rx="110" ry="42" fill="#ffffff" opacity="0.55" />
      <ellipse cx="280" cy="118" rx="70" ry="30" fill="#ffffff" opacity="0.45" />
      <ellipse cx="780" cy="100" rx="95" ry="36" fill="#ffffff" opacity="0.5" />
      <ellipse cx="840" cy="92" rx="55" ry="24" fill="#ffffff" opacity="0.4" />

      <ellipse cx={cx} cy={ARTBOARD_SIZE * 0.72} rx={520} ry={180} fill="#4d8c45" opacity="0.25" />
      <ellipse cx={cx - 180} cy={ARTBOARD_SIZE * 0.68} rx={280} ry={100} fill="#3f7a3a" opacity="0.18" />
      <ellipse cx={cx + 200} cy={ARTBOARD_SIZE * 0.7} rx={300} ry={110} fill="#3f7a3a" opacity="0.18" />
    </>
  )
}

export function drawTreeShadow(cx: number, cy: number, size: number) {
  return (
    <ellipse
      cx={cx}
      cy={cy + size * 0.38}
      rx={size * 0.42}
      ry={size * 0.12}
      fill="#2d4a28"
      opacity={0.35}
    />
  )
}

export function drawBuildingShadow(cx: number, cy: number, size: number) {
  return (
    <ellipse
      cx={cx}
      cy={cy + size * 0.32}
      rx={size * 0.38}
      ry={size * 0.1}
      fill="#2d4a28"
      opacity={0.3}
    />
  )
}

export function drawSlotGlow(
  cx: number,
  cy: number,
  size: number,
  unlocked: boolean,
  selected: boolean,
) {
  if (!unlocked && !selected) return null
  const color = selected ? '#ffd666' : '#ffe08a'
  const opacity = selected ? 0.45 : 0.28
  return (
    <ellipse
      cx={cx}
      cy={cy + 8}
      rx={size * 0.52}
      ry={size * 0.2}
      fill={color}
      opacity={opacity}
    />
  )
}

export function drawLevelBadge(cx: number, cy: number, level: number) {
  const w = 52
  const h = 22
  const x = cx - w / 2
  const y = cy
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill="#2d3436" opacity={0.88} />
      <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} rx={5} fill="#1e272e" opacity={0.9} />
      <text
        x={cx}
        y={y + 15}
        textAnchor="middle"
        fill="#ffeaa7"
        fontSize={13}
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        Lv.{level}
      </text>
    </g>
  )
}

export function drawSelectionRing(area: { x: number; y: number; w: number; h: number }) {
  return (
    <rect
      x={area.x + 4}
      y={area.y + 4}
      width={area.w - 8}
      height={area.h - 8}
      rx={18}
      fill="none"
      stroke="#ffd666"
      strokeWidth={5}
      strokeDasharray="12 8"
      opacity={0.85}
    />
  )
}
