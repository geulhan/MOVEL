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

function VillageNpc({ npc }: { npc: VillageNpcDef }) {
  const d = pathToSvgD(npc.path)
  const s = npc.scale

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
        <g transform={`scale(${s})`}>
          <ellipse cx={0} cy={10} rx={9} ry={3} fill="rgba(0,0,0,0.15)" />
          <rect x={-7} y={0} width={14} height={16} rx={4} fill={npc.shirt} stroke="#263238" strokeWidth={1.2} />
          <rect x={-6} y={14} width={5} height={10} rx={2} fill={npc.pants} />
          <rect x={1} y={14} width={5} height={10} rx={2} fill={npc.pants} />
          <circle cx={0} cy={-6} r={8} fill={npc.skin} stroke="#5d4037" strokeWidth={1.2} />
          <circle cx={-7} cy={4} r={3} fill={npc.skin} />
          <circle cx={7} cy={4} r={3} fill={npc.skin} />
        </g>
      </g>
    </g>
  )
}
