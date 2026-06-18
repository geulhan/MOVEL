import type { WorldBuildingKey } from '../data/worldLayout'

type Props = {
  buildingKey: WorldBuildingKey
  isBuilt: boolean
  isActive: boolean
  className?: string
}

export function BuildingInteriorScene({
  buildingKey,
  isBuilt,
  isActive,
  className = '',
}: Props) {
  const dim = !isBuilt
  const glow = isActive && isBuilt

  return (
    <div
      className={`relative overflow-hidden rounded-xl border-2 border-charcoal/15 bg-gradient-to-b from-sky-200 to-green-100 ${className}`}
      style={{ minHeight: 160 }}
    >
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-[#6aab58] to-[#8ecf7a]" />
        <div className="absolute bottom-[38%] left-[10%] h-8 w-24 rounded-full bg-[#5d9e52] opacity-60" />
        <div className="absolute bottom-[42%] right-[8%] h-6 w-20 rounded-full bg-[#5d9e52] opacity-50" />
      </div>

      <svg
        viewBox="0 0 320 160"
        className="relative z-10 h-full w-full"
        aria-hidden
      >
        {buildingKey === 'gym' && <GymInterior dim={dim} glow={glow} />}
        {buildingKey === 'track' && <TrackInterior dim={dim} glow={glow} />}
        {buildingKey === 'recovery' && <RecoveryInterior dim={dim} glow={glow} />}
        {buildingKey === 'nutrition' && <NutritionInterior dim={dim} glow={glow} />}
        {buildingKey === 'plaza' && <PlazaInterior dim={dim} glow={glow} />}
        {buildingKey === 'hall' && <HallInterior dim={dim} glow={glow} />}
      </svg>

      {glow && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-[#5a9e6f] px-2 py-0.5 text-[10px] font-bold text-white shadow">
          운영 중
        </div>
      )}
      {dim && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-charcoal/25">
          <span className="rounded-lg bg-white/90 px-3 py-1 text-xs font-semibold text-charcoal">
            아직 건설되지 않았어요
          </span>
        </div>
      )}
    </div>
  )
}

function GymInterior({ dim, glow }: { dim: boolean; glow: boolean }) {
  const o = dim ? 0.35 : 1
  return (
    <g opacity={o}>
      <rect x="40" y="70" width="240" height="70" rx="4" fill="#546e7a" stroke="#263238" strokeWidth="2" />
      <rect x="50" y="55" width="220" height="20" fill="#78909c" stroke="#263238" strokeWidth="2" />
      <text x="160" y="68" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
        체육관
      </text>
      <rect x="70" y="95" width="40" height="25" rx="2" fill="#455a64" />
      <circle cx="110" cy="108" r="8" fill="#37474f" />
      <rect x="150" y="100" width="30" height="6" fill="#263238" />
      <circle cx="148" cy="103" r="7" fill="#37474f" />
      <circle cx="182" cy="103" r="7" fill="#37474f" />
      <circle cx="200" cy="88" r="10" fill="#ffcc80" stroke="#263238" strokeWidth="1.5" />
      <rect x="193" y="98" width="14" height="22" rx="3" fill="#ef5350" />
      {glow && (
        <text x="200" y="82" textAnchor="middle" fontSize="14">
          💪
        </text>
      )}
    </g>
  )
}

function TrackInterior({ dim, glow }: { dim: boolean; glow: boolean }) {
  const o = dim ? 0.35 : 1
  return (
    <g opacity={o}>
      <ellipse cx="160" cy="110" rx="110" ry="35" fill="none" stroke="#c62828" strokeWidth="6" />
      <ellipse cx="160" cy="110" rx="80" ry="22" fill="#e8f5e9" />
      <circle cx="120" cy="105" r="9" fill="#ffcc80" stroke="#263238" strokeWidth="1.5" />
      <rect x="113" y="114" width="14" height="18" rx="2" fill="#1565c0" />
      {glow && (
        <circle cx="160" cy="108" r="4" fill="#ef5350">
          <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  )
}

function RecoveryInterior({ dim, glow }: { dim: boolean; glow: boolean }) {
  const o = dim ? 0.35 : 1
  return (
    <g opacity={o}>
      <rect x="60" y="75" width="200" height="65" rx="4" fill="#00897b" stroke="#263238" strokeWidth="2" />
      <rect x="80" y="100" width="50" height="12" rx="4" fill="#b2dfdb" />
      <rect x="150" y="100" width="50" height="12" rx="4" fill="#b2dfdb" />
      <circle cx="105" cy="90" r="8" fill="#ffcc80" />
      <circle cx="175" cy="92" r="8" fill="#ffcc80" />
      {glow && <text x="160" y="88" textAnchor="middle" fontSize="12">😌</text>}
    </g>
  )
}

function NutritionInterior({ dim, glow }: { dim: boolean; glow: boolean }) {
  const o = dim ? 0.35 : 1
  return (
    <g opacity={o}>
      <rect x="70" y="70" width="180" height="75" rx="4" fill="#ef6c00" stroke="#263238" strokeWidth="2" />
      <rect x="90" y="95" width="140" height="20" rx="2" fill="#fff3e0" />
      <circle cx="120" cy="88" r="8" fill="#66bb6a" />
      <circle cx="150" cy="88" r="8" fill="#ef5350" />
      <circle cx="180" cy="88" r="8" fill="#ffca28" />
      {glow && <text x="160" y="115" textAnchor="middle" fontSize="11">🥗 기록 중</text>}
    </g>
  )
}

function PlazaInterior({ dim, glow }: { dim: boolean; glow: boolean }) {
  const o = dim ? 0.35 : 1
  return (
    <g opacity={o}>
      <rect x="50" y="100" width="220" height="40" rx="2" fill="#d4c4a0" stroke="#8d6e4a" strokeWidth="2" />
      <circle cx="100" cy="92" r="9" fill="#ffcc80" stroke="#263238" strokeWidth="1.5" />
      <circle cx="160" cy="88" r="9" fill="#ffcc80" stroke="#263238" strokeWidth="1.5" />
      <circle cx="220" cy="92" r="9" fill="#ffcc80" stroke="#263238" strokeWidth="1.5" />
      {glow && (
        <text x="160" y="78" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#2d6a3e">
          모여 운동 중
        </text>
      )}
    </g>
  )
}

function HallInterior({ dim, glow }: { dim: boolean; glow: boolean }) {
  const o = dim ? 0.35 : 1
  return (
    <g opacity={o}>
      <rect x="80" y="60" width="160" height="85" rx="4" fill="#6a1b9a" stroke="#263238" strokeWidth="2" />
      <polygon points="80,60 160,30 240,60" fill="#4a148c" stroke="#263238" strokeWidth="2" />
      <rect x="110" y="80" width="30" height="25" fill="#ffca28" stroke="#f57f17" strokeWidth="1" />
      <rect x="150" y="80" width="30" height="25" fill="#ffca28" stroke="#f57f17" strokeWidth="1" />
      <rect x="190" y="80" width="30" height="25" fill="#ffca28" stroke="#f57f17" strokeWidth="1" />
      {glow && <text x="160" y="120" textAnchor="middle" fontSize="11" fill="#fff59d">🏆 업적 전시</text>}
    </g>
  )
}
