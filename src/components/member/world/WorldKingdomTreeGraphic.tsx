type StageKey = 'seed' | 'sprout' | 'small' | 'large' | 'sakura' | string

type Props = {
  cx: number
  cy: number
  size: number
  stageKey: StageKey
}

const OUTLINE = '#264018'
const TRUNK = '#8B5A3C'
const TRUNK_DARK = '#6B4226'

const GREEN = {
  light: '#9AEA72',
  mid: '#62C44E',
  dark: '#3E9638',
}

const SAKURA = {
  light: '#FFD4EA',
  mid: '#FF9EC8',
  dark: '#E878A8',
}

function Puff({
  x,
  y,
  r,
  fill,
}: {
  x: number
  y: number
  r: number
  fill: string
}) {
  return (
  <>
    <circle cx={x} cy={y} r={r} fill={fill} stroke={OUTLINE} strokeWidth={2.2} />
    <circle cx={x - r * 0.28} cy={y - r * 0.22} r={r * 0.2} fill="#ffffff" opacity={0.28} />
  </>
  )
}

function Trunk({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={w * 0.28}
        fill={TRUNK}
        stroke={OUTLINE}
        strokeWidth={2}
      />
      <rect
        x={x + w * 0.22}
        y={y + h * 0.15}
        width={w * 0.18}
        height={h * 0.55}
        rx={1}
        fill={TRUNK_DARK}
        opacity={0.35}
      />
    </>
  )
}

function SeedTree() {
  return (
    <g>
      <ellipse cx={50} cy={86} rx={14} ry={5} fill="#5a4638" opacity={0.35} />
      <ellipse cx={50} cy={84} rx={11} ry={4} fill="#6B5344" stroke={OUTLINE} strokeWidth={1.5} />
      <ellipse cx={50} cy={76} rx={7} ry={8} fill="#C4956A" stroke={OUTLINE} strokeWidth={2} />
      <path
        d="M50 68 C46 64 44 58 48 54 C50 57 52 57 54 54 C58 58 56 64 52 68 Z"
        fill={GREEN.mid}
        stroke={OUTLINE}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </g>
  )
}

function SproutTree() {
  return (
    <g>
      <Trunk x={46} y={58} w={8} h={24} />
      <Puff x={50} y={46} r={13} fill={GREEN.mid} />
      <Puff x={40} y={52} r={8} fill={GREEN.light} />
      <Puff x={60} y={52} r={8} fill={GREEN.dark} />
    </g>
  )
}

function SmallTree() {
  return (
    <g>
      <Trunk x={44} y={54} w={12} h={28} />
      <ellipse cx={50} cy={82} rx={16} ry={5} fill="#3d6638" opacity={0.25} />
      <Puff x={50} y={36} r={15} fill={GREEN.mid} />
      <Puff x={34} y={44} r={11} fill={GREEN.light} />
      <Puff x={66} y={44} r={11} fill={GREEN.dark} />
      <Puff x={42} y={52} r={9} fill={GREEN.mid} />
      <Puff x={58} y={52} r={9} fill={GREEN.mid} />
    </g>
  )
}

function LandmarkTree({ palette }: { palette: typeof GREEN }) {
  return (
    <g>
      <ellipse cx={50} cy={86} rx={22} ry={6} fill="#2d4a28" opacity={0.22} />
      <Trunk x={41} y={50} w={18} h={34} />
      <ellipse cx={38} cy={82} rx={8} ry={4} fill={TRUNK_DARK} opacity={0.5} />
      <ellipse cx={62} cy={82} rx={8} ry={4} fill={TRUNK_DARK} opacity={0.5} />
      <Puff x={50} y={24} r={18} fill={palette.mid} />
      <Puff x={30} y={34} r={14} fill={palette.light} />
      <Puff x={70} y={34} r={14} fill={palette.dark} />
      <Puff x={36} y={48} r={12} fill={palette.mid} />
      <Puff x={64} y={48} r={12} fill={palette.mid} />
      <Puff x={50} y={42} r={11} fill={palette.light} />
      <Puff x={24} y={46} r={9} fill={palette.dark} />
      <Puff x={76} y={46} r={9} fill={palette.dark} />
    </g>
  )
}

function renderStage(stageKey: StageKey) {
  switch (stageKey) {
    case 'sprout':
      return <SproutTree />
    case 'small':
      return <SmallTree />
    case 'large':
      return <LandmarkTree palette={GREEN} />
    case 'sakura':
      return <LandmarkTree palette={SAKURA} />
    case 'seed':
    default:
      return <SeedTree />
  }
}

/** 모바일 타이쿤 스타일 · 탑다운 왕국 랜드마크 나무 (투명 배경 SVG) */
export function WorldKingdomTreeGraphic({ cx, cy, size, stageKey }: Props) {
  const x = cx - size / 2
  const y = cy - size * 0.72

  return (
    <g filter="url(#wm-tree-shadow)">
      <svg
        x={x}
        y={y}
        width={size}
        height={size}
        viewBox="0 0 100 100"
        overflow="visible"
        aria-hidden
      >
        {renderStage(stageKey)}
      </svg>
    </g>
  )
}
