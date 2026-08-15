import { generateVillageNpcs, pathToSvgD, type VillageNpcDef } from './data/worldNpcs'
import {
  NPC_PALETTES,
  VillageNpcSpeechBubble,
  VillageNpcSprite,
} from './VillageNpcSprite'

export function VillageNpcLayer() {
  const npcs = generateVillageNpcs()

  return (
    <g id="village-npcs">
      <defs>
        <filter id="npc-bubble-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx={0} dy={2} stdDeviation={2} floodColor="#1a3018" floodOpacity={0.2} />
        </filter>
      </defs>
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
  const palette = NPC_PALETTES[npc.style]

  return (
    <g transform={`scale(${npc.scale})`}>
      {showBubble && npc.bubble && <VillageNpcSpeechBubble text={npc.bubble} />}
      <g>
        {!npc.static && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0;0,-2;0,0"
            dur="0.7s"
            repeatCount="indefinite"
          />
        )}
        <VillageNpcSprite
          palette={palette}
          style={npc.style}
          waving={npc.waving}
        />
      </g>
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
        >
          <mpath href={`#path-${npc.id}`} />
        </animateMotion>
        <NpcBody npc={npc} showBubble={false} />
      </g>
    </g>
  )
}
