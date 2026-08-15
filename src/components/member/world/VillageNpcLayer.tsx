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
        <g transform="translate(0, -42)">
          <rect
            x={-52}
            y={-18}
            width={104}
            height={22}
            rx={8}
            fill="#fffef8"
            stroke="#5a9e6f"
            strokeWidth={1.2}
            opacity={0.95}
          />
          <polygon points="-6,4 0,10 6,4" fill="#fffef8" stroke="#5a9e6f" strokeWidth={1} />
          <text
            x={0}
            y={-4}
            textAnchor="middle"
            fill="#2d4a28"
            fontSize={8}
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
          >
            {npc.bubble}
          </text>
        </g>
      )}
      <ellipse cx={0} cy={10} rx={9} ry={3} fill="rgba(0,0,0,0.15)" />
      <rect
        x={-7}
        y={0}
        width={14}
        height={16}
        rx={4}
        fill={npc.shirt}
        stroke="#263238"
        strokeWidth={1.2}
      />
      <rect x={-6} y={14} width={5} height={10} rx={2} fill={npc.pants} />
      <rect x={1} y={14} width={5} height={10} rx={2} fill={npc.pants} />
      <circle cx={0} cy={-6} r={8} fill={npc.skin} stroke="#5d4037" strokeWidth={1.2} />
      <circle cx={-7} cy={4} r={3} fill={npc.skin} />
      <circle cx={7} cy={4} r={3} fill={npc.skin} />
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
