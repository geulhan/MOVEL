import { useMemo, useState } from 'react'
import {
  moveGardenItem,
  placeGardenItem,
  purchaseGardenItem,
  retrieveGardenItem,
} from '../../../api/garden'
import { formatSupabaseError } from '../../../lib/errors'
import { useGardenState } from '../../../hooks/useGardenState'
import type { GardenPlacedItem } from '../../../types/garden'
import { btnOutline, btnPrimary, cardClass } from '../../../styles/theme'
import { GardenPixelSprite, resolveTreeSpriteKey } from './GardenPixelSprite'

type Props = {
  memberId: string
  refreshToken?: number
}

type Mode =
  | { kind: 'view' }
  | { kind: 'place'; shopItemId: string; spriteKey: string; itemName: string }
  | { kind: 'move'; placementId: string; spriteKey: string; itemName: string }

function gardenErrorMessage(err: unknown): string {
  const msg = formatSupabaseError(err)
  if (msg.includes('INSUFFICIENT_ACORNS')) {
    return '도토리가 부족해요. 운동하고 성장치를 쌓아 도토리를 모아보세요!'
  }
  if (msg.includes('GARDEN_TREE_TILE_BLOCKED')) {
    return '운동나무가 있는 칸에는 배치할 수 없어요.'
  }
  if (msg.includes('GARDEN_TILE_OCCUPIED')) {
    return '이미 아이템이 있는 칸이에요.'
  }
  if (msg.includes('GARDEN_INVENTORY_EMPTY')) {
    return '보관함에 아이템이 없어요. 상점에서 먼저 구매해 주세요.'
  }
  return msg
}

export function MemberGardenSection({ memberId, refreshToken = 0 }: Props) {
  const { state, loading, error, reload, setState } = useGardenState(
    memberId,
    refreshToken,
  )
  const [mode, setMode] = useState<Mode>({ kind: 'view' })
  const [selectedPlacement, setSelectedPlacement] = useState<GardenPlacedItem | null>(
    null,
  )
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const placedMap = useMemo(() => {
    const map = new Map<string, GardenPlacedItem>()
    for (const item of state?.placed_items ?? []) {
      map.set(`${item.x},${item.y}`, item)
    }
    return map
  }, [state?.placed_items])

  const treeSprite = resolveTreeSpriteKey(state?.tree_stage_key ?? 'seed')

  async function runAction(action: () => Promise<void>) {
    setActionLoading(true)
    setActionError(null)
    try {
      await action()
    } catch (err) {
      setActionError(gardenErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  function handleTileClick(x: number, y: number) {
    if (!state) return

    const isTree =
      x === state.garden.tree_x && y === state.garden.tree_y
    if (isTree) return

    const placed = placedMap.get(`${x},${y}`)

    if (mode.kind === 'place') {
      void runAction(async () => {
        const next = await placeGardenItem(memberId, mode.shopItemId, x, y)
        setState(next)
        setMode({ kind: 'view' })
      })
      return
    }

    if (mode.kind === 'move') {
      if (placed && placed.id !== mode.placementId) return
      void runAction(async () => {
        const next = await moveGardenItem(memberId, mode.placementId, x, y)
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
        정원을 불러오는 중…
      </div>
    )
  }

  if (error || !state) {
    return (
      <div className={`${cardClass} border-red-200 bg-red-50 p-4`}>
        <p className="text-sm font-medium text-red-800">
          {error ?? '정원 정보를 불러올 수 없습니다.'}
        </p>
        <p className="mt-2 text-xs text-red-600/80">
          Supabase에서 migration_085_garden_mvp.sql 실행 후 다시 시도해 주세요.
        </p>
        <button type="button" className={`${btnOutline} mt-3 text-sm`} onClick={() => void reload()}>
          다시 시도
        </button>
      </div>
    )
  }

  const width = state.garden.width
  const height = state.garden.height
  const tileSize = 32

  return (
    <div className="space-y-4">
      <section className={`${cardClass} p-4`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-charcoal">나의 정원</h3>
            <p className="mt-0.5 text-xs text-muted">
              운동나무 {state.tree_stage_name} · {width}×{height}
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
                  const isTree =
                    x === state.garden.tree_x && y === state.garden.tree_y
                  const placed = placedMap.get(`${x},${y}`)
                  const isSelected = selectedPlacement?.id === placed?.id
                  const isMoveTarget =
                    mode.kind === 'move' && mode.placementId === placed?.id

                  let spriteKey = 'grass'
                  if (isTree) spriteKey = treeSprite
                  else if (placed) spriteKey = placed.sprite_key

                  return (
                    <button
                      key={`${x}-${y}`}
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleTileClick(x, y)}
                      className={`relative flex items-center justify-center border border-[#4a7c3f]/20 transition ${
                        isSelected || isMoveTarget
                          ? 'ring-2 ring-inset ring-amber-400'
                          : mode.kind !== 'view' && !isTree && !placed
                            ? 'hover:bg-white/30'
                            : ''
                      }`}
                      style={{ width: tileSize, height: tileSize }}
                      aria-label={`타일 ${x + 1},${y + 1}`}
                    >
                      {!placed && !isTree && (
                        <GardenPixelSprite spriteKey="grass" scale={2} />
                      )}
                      {(isTree || placed) && (
                        <GardenPixelSprite spriteKey={spriteKey} scale={2} />
                      )}
                    </button>
                  )
                }),
              )}
            </div>
          </div>
        </div>

        {selectedPlacement && mode.kind === 'view' && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-gold/25 bg-cream/50 px-3 py-3">
            <p className="text-sm font-medium text-charcoal">
              {selectedPlacement.item_name} 선택됨
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
                  itemName: selectedPlacement.item_name,
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
                  const next = await retrieveGardenItem(memberId, selectedPlacement.id)
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
          <p className="mt-1 text-xs text-muted">탭해서 정원에 배치하세요</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {state.inventory.map((item) => (
              <li key={item.shop_item_id}>
                <button
                  type="button"
                  disabled={actionLoading || mode.kind !== 'view'}
                  onClick={() =>
                    setMode({
                      kind: 'place',
                      shopItemId: item.shop_item_id,
                      spriteKey: item.sprite_key,
                      itemName: item.item_name,
                    })
                  }
                  className="flex items-center gap-2 rounded-xl border border-gold/25 bg-white px-3 py-2 text-left hover:bg-cream/60"
                >
                  <GardenPixelSprite spriteKey={item.sprite_key} scale={2} />
                  <span className="text-sm font-medium text-charcoal">
                    {item.item_name}
                    <span className="ml-1 text-xs text-muted">×{item.quantity}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`${cardClass} p-4`}>
        <h3 className="text-base font-semibold text-charcoal">도토리 상점</h3>
        <p className="mt-1 text-xs text-muted">
          운동으로 모은 도토리로 정원을 꾸며보세요
        </p>
        <ul className="mt-3 space-y-3">
          {state.shop_items.map((item) => {
            const canBuy = state.current_acorns >= item.cost_acorns
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gold/20 bg-white px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <GardenPixelSprite spriteKey={item.sprite_key} scale={2} />
                  <div>
                    <p className="font-semibold text-charcoal">{item.item_name}</p>
                    <p className="text-xs text-amber-800">
                      🌰 {item.cost_acorns.toLocaleString()} 도토리
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className={canBuy ? btnPrimary : btnOutline}
                  disabled={!canBuy || actionLoading}
                  onClick={() =>
                    void runAction(async () => {
                      const next = await purchaseGardenItem(memberId, item.id)
                      setState(next)
                    })
                  }
                >
                  구매
                </button>
              </li>
            )
          })}
        </ul>
        {state.current_acorns < 20 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            도토리가 부족해요. PT 출석, 운동일지 작성으로 도토리를 모아보세요!
          </p>
        )}
      </section>
    </div>
  )
}
