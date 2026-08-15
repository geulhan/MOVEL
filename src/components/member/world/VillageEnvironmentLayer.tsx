import type { EnvProp, EnvPropType } from './data/worldEnvironment'

type Props = {
  props: EnvProp[]
}

export function VillageEnvironmentLayer({ props }: Props) {
  return (
    <g id="environment" opacity={0.92}>
      {props.map((p) => (
        <g
          key={p.id}
          transform={`translate(${p.x}, ${p.y}) rotate(${p.rot}) scale(${p.scale})`}
        >
          <EnvPropGraphic type={p.type} />
        </g>
      ))}
    </g>
  )
}

function EnvPropGraphic({ type }: { type: EnvPropType }) {
  switch (type) {
    case 'small_tree':
      return <SmallTree />
    case 'flower_bed':
      return <FlowerBed />
    case 'dumbbell_rack':
      return <DumbbellRack />
    case 'bench':
      return <Bench />
    case 'street_lamp':
      return <StreetLamp />
    case 'exercise_sign':
      return <ExerciseSign />
    case 'rock':
      return <Rock />
    case 'fence':
      return <Fence />
    case 'dirt_path':
      return <DirtPatch />
    case 'grass_patch':
      return <GrassPatch />
    case 'chicken':
      return <Chicken />
    case 'sheep':
      return <Sheep />
    default:
      return null
  }
}

function SmallTree() {
  return (
    <g>
      <ellipse cx={0} cy={10} rx={14} ry={4} fill="rgba(30,50,25,0.2)" />
      <rect x={-2} y={0} width={4} height={12} fill="#6d4c41" />
      <circle cx={0} cy={-6} r={11} fill="#43a047" />
      <circle cx={-5} cy={-2} r={7} fill="#66bb6a" />
      <circle cx={6} cy={-3} r={8} fill="#388e3c" />
    </g>
  )
}

function FlowerBed() {
  return (
    <g>
      <ellipse cx={0} cy={6} rx={16} ry={6} fill="#8d6e4a" opacity={0.5} />
      <ellipse cx={0} cy={4} rx={14} ry={5} fill="#c9a86c" />
      {[-8, -3, 3, 8].map((fx, i) => (
        <g key={i}>
          <line x1={fx} y1={4} x2={fx} y2={-2} stroke="#558b2f" strokeWidth={1.5} />
          <circle cx={fx} cy={-4} r={3} fill={['#ef5350', '#ffca28', '#ab47bc', '#42a5f5'][i]} />
        </g>
      ))}
    </g>
  )
}

function DumbbellRack() {
  return (
    <g>
      <rect x={-14} y={-2} width={28} height={4} rx={1} fill="#78909c" />
      <rect x={-12} y={2} width={3} height={10} fill="#546e7a" />
      <rect x={9} y={2} width={3} height={10} fill="#546e7a" />
      <rect x={-10} y={6} width={8} height={3} rx={1} fill="#37474f" />
      <circle cx={-6} cy={7.5} r={4} fill="#263238" />
      <circle cx={-2} cy={7.5} r={4} fill="#263238" />
      <rect x={4} y={6} width={8} height={3} rx={1} fill="#37474f" />
      <circle cx={8} cy={7.5} r={4} fill="#263238" />
      <circle cx={12} cy={7.5} r={4} fill="#263238" />
    </g>
  )
}

function Bench() {
  return (
    <g>
      <rect x={-14} y={0} width={28} height={4} rx={1} fill="#8d6e63" />
      <rect x={-12} y={4} width={3} height={8} fill="#5d4037" />
      <rect x={9} y={4} width={3} height={8} fill="#5d4037" />
      <rect x={-14} y={-3} width={28} height={3} rx={1} fill="#a1887f" />
    </g>
  )
}

function StreetLamp() {
  return (
    <g>
      <rect x={-1.5} y={-18} width={3} height={22} fill="#546e7a" />
      <ellipse cx={0} cy={-20} rx={8} ry={4} fill="#fff9c4" opacity={0.9} />
      <circle cx={0} cy={-20} r={3} fill="#ffee58" />
    </g>
  )
}

function ExerciseSign() {
  return (
    <g>
      <rect x={-2} y={-4} width={4} height={18} fill="#6d4c41" />
      <rect x={-12} y={-16} width={24} height={14} rx={2} fill="#ef5350" stroke="#b71c1c" strokeWidth={1.5} />
      <text x={0} y={-7} textAnchor="middle" fill="#fff" fontSize={8} fontWeight="bold">
        RUN
      </text>
    </g>
  )
}

function Rock() {
  return (
    <g>
      <ellipse cx={0} cy={4} rx={10} ry={4} fill="rgba(30,50,25,0.18)" />
      <ellipse cx={-2} cy={0} rx={9} ry={7} fill="#9e9e9e" />
      <ellipse cx={4} cy={2} rx={7} ry={5} fill="#bdbdbd" />
    </g>
  )
}

function Fence() {
  return (
    <g>
      {[-16, -8, 0, 8, 16].map((fx) => (
        <g key={fx}>
          <rect x={fx - 1} y={-8} width={2} height={14} fill="#a1887f" />
          <rect x={fx - 3} y={-6} width={6} height={2} fill="#8d6e63" />
          <rect x={fx - 3} y={0} width={6} height={2} fill="#8d6e63" />
        </g>
      ))}
      <rect x={-18} y={-8} width={36} height={2} fill="#6d4c41" />
    </g>
  )
}

function DirtPatch() {
  return (
    <g opacity={0.85}>
      <ellipse cx={0} cy={0} rx={18} ry={10} fill="#b8956a" />
      <ellipse cx={-4} cy={2} rx={8} ry={5} fill="#a08058" opacity={0.6} />
    </g>
  )
}

function GrassPatch() {
  return (
    <g opacity={0.75}>
      <ellipse cx={0} cy={2} rx={16} ry={9} fill="#7cb86a" />
      {[-6, 0, 6].map((gx) => (
        <line key={gx} x1={gx} y1={6} x2={gx + (gx > 0 ? 2 : -2)} y2={-4} stroke="#558b2f" strokeWidth={1.5} />
      ))}
    </g>
  )
}

function Chicken() {
  return (
    <g>
      <ellipse cx={0} cy={8} rx={10} ry={3} fill="rgba(30,50,25,0.18)" />
      <ellipse cx={0} cy={2} rx={8} ry={7} fill="#fff8e1" stroke="#f9a825" strokeWidth={1} />
      <circle cx={6} cy={-2} r={5} fill="#fff8e1" stroke="#f9a825" strokeWidth={1} />
      <polygon points="10,-2 14,0 10,2" fill="#ff8f00" />
      <circle cx={7} cy={-3} r={1.2} fill="#263238" />
      <line x1={-2} y1={8} x2={-2} y2={12} stroke="#ff8f00" strokeWidth={2} />
      <line x1={2} y1={8} x2={2} y2={12} stroke="#ff8f00" strokeWidth={2} />
    </g>
  )
}

function Sheep() {
  return (
    <g>
      <ellipse cx={0} cy={10} rx={14} ry={4} fill="rgba(30,50,25,0.18)" />
      <ellipse cx={0} cy={0} rx={12} ry={9} fill="#eceff1" stroke="#b0bec5" strokeWidth={1} />
      <ellipse cx={-8} cy={2} rx={5} ry={6} fill="#eceff1" stroke="#b0bec5" strokeWidth={0.8} />
      <ellipse cx={8} cy={2} rx={5} ry={6} fill="#eceff1" stroke="#b0bec5" strokeWidth={0.8} />
      <circle cx={10} cy={-2} r={5} fill="#cfd8dc" stroke="#90a4ae" strokeWidth={1} />
      <circle cx={12} cy={-3} r={1} fill="#263238" />
      <line x1={-6} y1={8} x2={-6} y2={13} stroke="#78909c" strokeWidth={2} />
      <line x1={6} y1={8} x2={6} y2={13} stroke="#78909c" strokeWidth={2} />
    </g>
  )
}
