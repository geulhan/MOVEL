import { cardClass } from '../../../styles/theme'

const STEPS = [
  { icon: '🏃', label: '운동', sub: 'PT·수업·일지·걸음' },
  { icon: '📈', label: '성장치', sub: '핵심 재화' },
  { icon: '🌳', label: '운동나무', sub: '단계 상승' },
  { icon: '🏘️', label: '마을 발전', sub: '건물·강화' },
  { icon: '🌰', label: '수거', sub: '운동 연동 보조' },
] as const

export function GrowthLoopExplainer() {
  return (
    <div className={`${cardClass} p-4`}>
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted">
        내 운동 세계 성장 루프
      </p>
      <p className="mt-1 text-center text-sm leading-relaxed text-charcoal/90">
        게임이 아니라 <strong className="text-charcoal">운동 습관</strong>을 위한 발전형 구조예요.
        <br />
        <span className="text-muted">성장치는 반드시 운동으로만 얻을 수 있어요.</span>
      </p>
      <div className="mt-4 overflow-x-auto pb-1">
        <ol className="flex min-w-[300px] items-start justify-between gap-0.5">
          {STEPS.map((step, idx) => (
            <li key={step.label} className="flex flex-1 flex-col items-center text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-charcoal/8 text-lg">
                {step.icon}
              </div>
              <p className="mt-1 text-[10px] font-bold text-charcoal">{step.label}</p>
              <p className="text-[9px] leading-tight text-muted">{step.sub}</p>
              {idx < STEPS.length - 1 && (
                <span className="sr-only">다음</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
