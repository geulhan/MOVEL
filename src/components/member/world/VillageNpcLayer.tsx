import { generateVillageNpcs, pathToSvgD, type VillageNpcDef } from './data/worldNpcs'

export function VillageNpcLayer() {
  const npcs = generateVillageNpcs()

  return (
    <g id="village-npcs">
      {npcs.map((npc) => (
        <VillageNpc key={npc.id} npc={npc} />
      ))}
    </g>
  )
}

function NpcBody({
  npc,
  showBubble,
}: {
  npc: VillageNpcDef
  showBubble: boolean
}) {
  const s = npc.scale

  return (
    <g transform={`scale(${s})`}>
      {showBubble && npc.bubble && (
        <g transform="translate(0, -46)">
          <rect
            x={-58}
            y={-20}
            width={116}
            height={24}
            rx={10}
            fill="#fffef8"
            stroke="#5a9e6f"
            strokeWidth={1.5}
            opacity={0.96}
          />
          <polygon points="-5,4 0,11 5,4" fill="#fffef8" stroke="#5a9e6f" strokeWidth={1} />
          <text
            x={0}
            y={-4}
            textAnchor="middle"
            fill="#2d4a28"
            fontSize={9}
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
          >
            {npc.bubble}
          </text>
        </g>
      )}
      <ellipse cx={0} cy={12} rx={10} ry={3.5} fill="rgba(0,0,0,0.18)" />
      <rect x={-8} y={2} width={16} height={18} rx={5} fill={npc.shirt} stroke="#263238" strokeWidth={1.2} />
      <rect x={-7} y={18} width={6} height={11} rx={2.5} fill={npc.pants} />
      <rect x={1} y={18} width={6} height={11} rx={2.5} fill={npc.pants} />
      <circle cx={0} cy={-7} r={9} fill={npc.skin} stroke="#5d4037" strokeWidth={1.2} />
      <ellipse cx={0} cy={-11} rx={10} ry={7} fill={npc.hair} />
      <circle cx={0} cy={-9} r={7} fill={npc.skin} />
    </g>
  )
}

function VillageNpc({ npc }: { npc: VillageNpcDef }) {
  if (npc.static) {
    const [x, y] = npc.path[0]
    return (
      <g transform={`translate(${x}, ${y})`}>
        <NpcBody npc={npc} showBubble />
      </g>
    )
  }

  const d = pathToSvgD(npc.path)

  return (
    <g>
      <path id={`path-${npc.id}`} d={d} fill="none" stroke="none" />
      <g>
        <animateMotion
          dur={`${npc.dur}s`}
          begin={`${npc.delay}s`}
          repeatCount="indefinite"
          rotate="auto"
        >
          <mpath href={`#path-${npc.id}`} />
        </animateMotion>
        <NpcBody npc={npc} showBubble={false} />
      </g>
    </g>
  )
}
