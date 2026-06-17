import { useMemo, useState } from 'react'
import {
  moveSlgBuilding,
  placeSlgBuilding,
  purchaseSlgBuilding,
  retrieveSlgBuilding,
} from '../../../api/slgVillage'
import { formatSupabaseError } from '../../../lib/errors'
import { useSlgVillage } from '../../../hooks/useSlgVillage'
import type { SlgVillageBuilding } from '../../../types/slgVillage'
import { SLG_TIER_LABELS } from '../../../types/slgVillage'
import { btnOutline, btnPrimary, cardClass } from '../../../styles/theme'
import { GardenPixelSprite, resolveTreeSpriteKey } from '../garden/GardenPixelSprite'
import { SlgVillagePixelSprite } from './SlgVillagePixelSprite'

type Props = {
  memberId: string
  refreshToken?: number
}

type Mode =
  | { kind: 'view' }
  | { kind: 'place'; buildingId: string; spriteKey: string; itemName: string }
  | { kind: 'move'; placementId: string; spriteKey: string; itemName: string }

function villageErrorMessage(err: unknown): string {
  const msg = formatSupabaseError(err)
  if (msg.includes('INSUFFICIENT_ACORNS')) {
    return '도토리가 부족해요. 운동하고 성장치를 쌓아 도토리를 모아보세요!'
  }
  if (msg.includes('SLG_GROWTH_REQUIRED')) {
    return '성장치가 더 필요해요. 운동으로 성장치를 쌓으면 건물이 해금됩니다.'
  }
  if (msg.includes('SLG_PLAZA_BLOCKED')) {
    return '광장(운동나무) 칸에는 배치할 수 없어요.'
  }
  if (msg.includes('SLG_TILE_OCCUPIED')) {
    return '이미 건물이 있는 칸이에요.'
  }
  if (msg.includes('SLG_INVENTORY_EMPTY')) {
    return '보관함에 건물이 없어요. 상점에서 먼저 구매해 주세요.'
  }
  if (msg.includes('SLG_OUT_OF_BOUNDS')) {
    return '마을 밖에는 배치할 수 없어요.'
  }
  return msg
}

export function MemberVillageSection({ memberId, refreshToken = 0 }: Props) {
  const { state, loading, error, reload, setState } = useSlgVillage(
    memberId,
    refreshToken,
  )
  const [mode, setMode] = useState<Mode>({ kind: 'view' })
  const [selectedPlacement, setSelectedPlacement] =
    useState<SlgVillageBuilding | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const placedMap = useMemo(() => {
    const map = new Map<string, SlgVillageBuilding>()
    for (const item of state?.buildings ?? []) {
      map.set(`${item.x},${item.y}`, item)
    }
    return map
  }, [state?.buildings])

  const treeSprite = resolveTreeSpriteKey(state?.tree_stage_key ?? 'seed')

  async function runAction(action: () => Promise<void>) {
    setActionLoading(true)
    setActionError(null)
    try {
      await action()
    } catch (err) {
      setActionError(villageErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  function handleTileClick(x: number, y: number) {
    if (!state) return

    const isPlaza =
      x === state.village.plaza_x && y === state.village.plaza_y
    if (isPlaza) return

    const placed = placedMap.get(`${x},${y}`)

    if (mode.kind === 'place') {
      void runAction(async () => {
        const next = await placeSlgBuilding(memberId, mode.buildingId, x, y)
        setState(next)
        setMode({ kind: 'view' })
      })
      return
    }

    if (mode.kind === 'move') {
      if (placed && placed.id !== mode.placementId) return
      void runAction(async () => {
        const next = await moveSlgBuilding(memberId, mode.placementId, x, y)
        setState(next)
        setMode({ kind: 'view' })
        setSelectedPlacement(null)
      })
      return
    }

    if (placed) {
      setSelectedPlacement(placed)
    } else {
      setSelectedPlacement(null)
    }
  }

  if (loading) {
    return (
      <div className={`${cardClass} p-6 text-center text-sm text-muted`}>
        마을을 불러오는 중…
      </div>
    )
  }

  if (error || !state) {
    return (
      <div className={`${cardClass} border-red-200 bg-red-50 p-4`}>
        <p className="text-sm font-medium text-red-800">
          {error ?? '마을 정보를 불러올 수 없습니다.'}
        </p>
        <p className="mt-2 text-xs text-red-600/80">
          Supabase에서 migration_087_slg_village_mvp.sql 실행 후 다시 시도해 주세요.
        </p>
        <button
          type="button"
          className={`${btnOutline} mt-3 text-sm`}
          onClick={() => void reload()}
        >
          다시 시도
        </button>
      </div>
    )
  }

  const width = state.village.width
  const height = state.village.height
  const tileSize = 32

  return (
    <div className="space-y-4">
      <section className={`${cardClass} p-4`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-charcoal">나의 마을</h3>
            <p className="mt-0.5 text-xs text-muted">
              운동나무 {state.tree_stage_name} · {width}×{height} · 성장치{' '}
              {state.total_growth.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-right">
            <p className="text-[10px] font-semibold text-amber-800">보유 도토리</p>
            <p className="text-lg font-bold tabular-nums text-amber-900">
              {state.current_acorns.toLocaleString()}
            </p>
          </div>
        </div>

        {mode.kind !== 'view' && (
          <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs font-medium text-sky-900">
            {mode.kind === 'place'
              ? `「${mode.itemName}」을(를) 놓을 칸을 탭하세요`
              : `「${mode.itemName}」을(를) 옮길 칸을 탭하세요`}
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => {
                setMode({ kind: 'view' })
                setSelectedPlacement(null)
              }}
            >
              취소
            </button>
          </p>
        )}

        <div className="mt-4 overflow-x-auto">
          <div
            className="mx-auto rounded-xl border-4 border-[#5a3e1b]/30 bg-[#8ed16e]/30 p-2 shadow-inner"
            style={{ width: width * tileSize + 16 }}
          >
            <div
              className="grid gap-0"
              style={{
                gridTemplateColumns: `repeat(${width}, ${tileSize}px)`,
                gridTemplateRows: `repeat(${height}, ${tileSize}px)`,
              }}
            >
              {Array.from({ length: height }, (_, y) =>
                Array.from({ length: width }, (_, x) => {
                  const isPlaza =
                    x === state.village.plaza_x && y === state.village.plaza_y
                  const placed = placedMap.get(`${x},${y}`)
                  const isSelected = selectedPlacement?.id === placed?.id
                  const isMoveTarget =
                    mode.kind === 'move' && mode.placementId === placed?.id

                  return (
                    <button
                      key={`${x}-${y}`}
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleTileClick(x, y)}
                      className={`relative flex items-center justify-center border border-[#4a7c3f]/20 transition ${
                        isSelected || isMoveTarget
                          ? 'ring-2 ring-inset ring-amber-400'
                          : mode.kind !== 'view' && !isPlaza && !placed
                            ? 'hover:bg-white/30'
                            : ''
                      }`}
                      style={{ width: tileSize, height: tileSize }}
                      aria-label={`타일 ${x + 1},${y + 1}`}
                    >
                      {isPlaza ? (
                        <>
                          <SlgVillagePixelSprite spriteKey="slg_plaza" scale={2} />
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <GardenPixelSprite spriteKey={treeSprite} scale={2} />
                          </span>
                        </>
                      ) : placed ? (
                        <SlgVillagePixelSprite spriteKey={placed.sprite_key} scale={2} />
                      ) : (
                        <GardenPixelSprite spriteKey="grass" scale={2} />
                      )}
                    </button>
                  )
                }),
              )}
            </div>
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-muted">
          가운데 광장의 운동나무는 성장치에 따라 자랍니다
        </p>

        {selectedPlacement && mode.kind === 'view' && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-gold/25 bg-cream/50 px-3 py-3">
            <p className="text-sm font-medium text-charcoal">
              {selectedPlacement.title} 선택됨
            </p>
            <button
              type="button"
              className={btnOutline}
              disabled={actionLoading}
              onClick={() =>
                setMode({
                  kind: 'move',
                  placementId: selectedPlacement.id,
                  spriteKey: selectedPlacement.sprite_key,
                  itemName: selectedPlacement.title,
                })
              }
            >
              이동
            </button>
            <button
              type="button"
              className={btnOutline}
              disabled={actionLoading}
              onClick={() =>
                void runAction(async () => {
                  const next = await retrieveSlgBuilding(
                    memberId,
                    selectedPlacement.id,
                  )
                  setState(next)
                  setSelectedPlacement(null)
                })
              }
            >
              회수
            </button>
            <p className="w-full text-[11px] text-muted">
              회수 시 도토리는 환급되지 않아요. 보관함으로 돌아갑니다.
            </p>
          </div>
        )}

        {actionError && (
          <p className="mt-3 text-sm text-red-700">{actionError}</p>
        )}
      </section>

      {state.inventory.length > 0 && (
        <section className={`${cardClass} p-4`}>
          <h3 className="text-base font-semibold text-charcoal">보관함</h3>
          <p className="mt-1 text-xs text-muted">탭해서 마을에 배치하세요</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {state.inventory.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={actionLoading || mode.kind !== 'view'}
                  onClick={() =>
                    setMode({
                      kind: 'place',
                      buildingId: item.building_id,
                      spriteKey: item.sprite_key,
                      itemName: item.title,
                    })
                  }
                  className="flex items-center gap-2 rounded-xl border border-gold/25 bg-white px-3 py-2 text-left hover:bg-cream/60"
                >
                  <SlgVillagePixelSprite spriteKey={item.sprite_key} scale={2} />
                  <span className="text-sm font-medium text-charcoal">
                    {item.title}
                    <span className="ml-1 text-xs text-muted">×{item.quantity}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`${cardClass} p-4`}>
        <h3 className="text-base font-semibold text-charcoal">건물 상점</h3>
        <p className="mt-1 text-xs text-muted">
          도토리로 건물을 구매하고 마을을 꾸며보세요. 성장치에 따라 상위 건물이
          해금됩니다.
        </p>
        <ul className="mt-3 space-y-3">
          {state.catalog.map((item) => {
            const canBuy =
              item.is_unlocked && state.current_acorns >= item.cost_acorns
            const tierLabel = SLG_TIER_LABELS[item.tier] ?? `T${item.tier}`

            return (
              <li
                key={item.id}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 ${
                  item.is_unlocked
                    ? 'border-gold/20 bg-white'
                    : 'border-gray-200 bg-gray-50/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={item.is_unlocked ? '' : 'opacity-40'}>
                    <SlgVillagePixelSprite spriteKey={item.sprite_key} scale={2} />
                  </div>
                  <div>
                    <p className="font-semibold text-charcoal">
                      {item.title}
                      <span className="ml-1.5 text-[10px] font-medium text-muted">
                        {tierLabel}
                      </span>
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted">{item.description}</p>
                    )}
                    {item.is_unlocked ? (
                      <p className="text-xs text-amber-800">
                        🌰 {item.cost_acorns.toLocaleString()} 도토리
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600">
                        🔒 성장치 {item.min_growth.toLocaleString()} 필요 (현재{' '}
                        {state.total_growth.toLocaleString()})
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className={canBuy ? btnPrimary : btnOutline}
                  disabled={!canBuy || actionLoading}
                  onClick={() =>
                    void runAction(async () => {
                      const next = await purchaseSlgBuilding(memberId, item.id)
                      setState(next)
                    })
                  }
                >
                  {item.is_unlocked ? '구매' : '잠김'}
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
