type Props = {
  pendingAcorns: number
  visible: boolean
}

/** P0: 표시만, 수거 로직은 P1 */
export function CollectFloatingButton({ pendingAcorns, visible }: Props) {
  if (!visible || pendingAcorns <= 0) return null

  return (
    <button
      type="button"
      className="pointer-events-auto absolute bottom-14 right-3 z-20 flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-900/30"
      onClick={(e) => {
        e.stopPropagation()
      }}
      aria-label={`도토리 ${pendingAcorns}개 수거 가능`}
    >
      <span aria-hidden>🌰</span>
      <span>{pendingAcorns.toLocaleString()}</span>
    </button>
  )
}
