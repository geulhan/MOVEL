export type NpcCharacterStyle = 'walker' | 'runner' | 'guide'

export type NpcPalette = {
  skin: string
  skinShadow: string
  hair: string
  hairLight: string
  top: string
  topShadow: string
  bottom: string
  shoes: string
  accent: string
}

export const NPC_PALETTES: Record<NpcCharacterStyle, NpcPalette> = {
  walker: {
    skin: '#ffccbc',
    skinShadow: '#f4a88a',
    hair: '#5d4037',
    hairLight: '#8d6e63',
    top: '#ff7043',
    topShadow: '#e64a19',
    bottom: '#5c6bc0',
    shoes: '#fafafa',
    accent: '#ffab91',
  },
  runner: {
    skin: '#ffe0b2',
    skinShadow: '#ffcc80',
    hair: '#3e2723',
    hairLight: '#6d4c41',
    top: '#66bb6a',
    topShadow: '#43a047',
    bottom: '#37474f',
    shoes: '#ffee58',
    accent: '#81c784',
  },
  guide: {
    skin: '#fff3e0',
    skinShadow: '#ffe0b2',
    hair: '#263238',
    hairLight: '#546e7a',
    top: '#42a5f5',
    topShadow: '#1e88e5',
    bottom: '#eceff1',
    shoes: '#455a64',
    accent: '#90caf9',
  },
}

type SpriteProps = {
  palette: NpcPalette
  style: NpcCharacterStyle
  waving?: boolean
}

/** 탑다운 치비 캐릭터 — 스타듀밸리·동물의숲 느낌 */
export function VillageNpcSprite({ palette, style, waving = false }: SpriteProps) {
  return (
    <g>
      <ellipse cx={0} cy={15} rx={12} ry={4.5} fill="rgba(15,35,12,0.2)" />

      <g id="npc-legs">
        <rect x={-7} y={19} width={6} height={11} rx={3} fill={palette.bottom} />
        <rect x={1} y={19} width={6} height={11} rx={3} fill={palette.bottom} />
        <ellipse cx={-4} cy={30} rx={5} ry={3} fill={palette.shoes} stroke="#37474f" strokeWidth={0.6} />
        <ellipse cx={4} cy={30} rx={5} ry={3} fill={palette.shoes} stroke="#37474f" strokeWidth={0.6} />
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;0,0.8;0,0"
          dur="0.55s"
          repeatCount="indefinite"
        />
      </g>

      <ellipse cx={0} cy={12} rx={11} ry={9} fill={palette.top} stroke={palette.topShadow} strokeWidth={1.2} />
      <ellipse cx={-4} cy={11} rx={4} ry={3} fill={palette.topShadow} opacity={0.25} />

      {waving ? (
        <>
          <ellipse cx={-12} cy={11} rx={3.5} ry={5} fill={palette.top} stroke={palette.topShadow} strokeWidth={0.8} />
          <circle cx={-12} cy={15} r={2.8} fill={palette.skin} />
          <g transform="rotate(-28 -12 8)">
            <ellipse cx={12} cy={4} rx={3.5} ry={5} fill={palette.top} stroke={palette.topShadow} strokeWidth={0.8} />
            <circle cx={12} cy={8} r={2.8} fill={palette.skin} />
          </g>
        </>
      ) : (
        <>
          <ellipse cx={-12} cy={12} rx={3.5} ry={5} fill={palette.top} stroke={palette.topShadow} strokeWidth={0.8} />
          <ellipse cx={12} cy={12} rx={3.5} ry={5} fill={palette.top} stroke={palette.topShadow} strokeWidth={0.8} />
          <circle cx={-12} cy={16} r={2.8} fill={palette.skin} />
          <circle cx={12} cy={16} r={2.8} fill={palette.skin} />
        </>
      )}

      <HairBack style={style} palette={palette} />
      <HeadFace palette={palette} />
      <HairFront style={style} palette={palette} />

      {style === 'runner' && <RunnerCap palette={palette} />}
      {style === 'guide' && <GuideHoodieDetail palette={palette} />}
    </g>
  )
}

function HeadFace({ palette }: { palette: NpcPalette }) {
  return (
    <g>
      <circle cx={0} cy={-1} r={12} fill={palette.skin} stroke={palette.skinShadow} strokeWidth={1} />
      <ellipse cx={-4.5} cy={1} rx={2.2} ry={2.8} fill="#37474f" />
      <ellipse cx={4.5} cy={1} rx={2.2} ry={2.8} fill="#37474f" />
      <circle cx={-3.5} cy={0} r={1} fill="#fff" opacity={0.9} />
      <circle cx={5.5} cy={0} r={1} fill="#fff" opacity={0.9} />
      <ellipse cx={-7.5} cy={4} rx={2.8} ry={1.6} fill={palette.accent} opacity={0.5} />
      <ellipse cx={7.5} cy={4} rx={2.8} ry={1.6} fill={palette.accent} opacity={0.5} />
      <path
        d="M -3.5 6.5 Q 0 9 3.5 6.5"
        fill="none"
        stroke="#8d6e63"
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </g>
  )
}

function HairBack({
  style,
  palette,
}: {
  style: NpcCharacterStyle
  palette: NpcPalette
}) {
  if (style === 'runner') {
    return (
      <ellipse cx={0} cy={-4} rx={13} ry={11} fill={palette.hair} opacity={0.9} />
    )
  }
  if (style === 'guide') {
    return (
      <ellipse cx={0} cy={-3} rx={13} ry={10} fill={palette.hair} />
    )
  }
  return (
    <g>
      <ellipse cx={0} cy={-3} rx={13} ry={11} fill={palette.hair} />
      <ellipse cx={-10} cy={2} rx={4} ry={7} fill={palette.hair} />
      <ellipse cx={10} cy={2} rx={4} ry={7} fill={palette.hair} />
    </g>
  )
}

function HairFront({
  style,
  palette,
}: {
  style: NpcCharacterStyle
  palette: NpcPalette
}) {
  if (style === 'walker') {
    return (
      <g>
        <path
          d="M -12 -2 C -13 -12 -6 -16 0 -15 C 6 -16 13 -12 12 -2"
          fill={palette.hair}
        />
        <ellipse cx={0} cy={-13} rx={5} ry={3} fill={palette.hairLight} opacity={0.45} />
        <ellipse cx={-11} cy={-4} rx={3.5} ry={5} fill={palette.hair} />
        <ellipse cx={11} cy={-4} rx={3.5} ry={5} fill={palette.hair} />
      </g>
    )
  }
  if (style === 'guide') {
    return (
      <path
        d="M -11 0 C -12 -10 -4 -14 0 -13 C 4 -14 12 -10 11 0 L 8 2 L -8 2 Z"
        fill={palette.hair}
      />
    )
  }
  return null
}

function RunnerCap({ palette }: { palette: NpcPalette }) {
  return (
    <g>
      <ellipse cx={0} cy={-12} rx={11} ry={5} fill={palette.topShadow} />
      <rect x={-10} y={-14} width={20} height={5} rx={2} fill={palette.topShadow} />
      <ellipse cx={0} cy={-9} rx={9} ry={3} fill={palette.top} opacity={0.85} />
    </g>
  )
}

function GuideHoodieDetail({ palette }: { palette: NpcPalette }) {
  return (
    <path
      d="M -8 4 L 0 10 L 8 4"
      fill="none"
      stroke={palette.topShadow}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  )
}

export function VillageNpcSpeechBubble({ text }: { text: string }) {
  return (
    <g transform="translate(0, -52)">
      <rect
        x={-62}
        y={-22}
        width={124}
        height={26}
        rx={12}
        fill="#fffef9"
        stroke="#5a9e6f"
        strokeWidth={1.5}
        filter="url(#npc-bubble-shadow)"
      />
      <polygon
        points="-6,4 0,12 6,4"
        fill="#fffef9"
        stroke="#5a9e6f"
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <text
        x={0}
        y={-5}
        textAnchor="middle"
        fill="#2d4a28"
        fontSize={9.5}
        fontWeight="600"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {text}
      </text>
    </g>
  )
}
