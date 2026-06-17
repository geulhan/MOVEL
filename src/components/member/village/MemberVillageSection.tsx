import { useMemo, useState } from 'react'
import {
  buildSlgVillageSlot,
  upgradeSlgVillageSlot,
} from '../../../api/slgVillage'
import { formatSupabaseError } from '../../../lib/errors'
import { useSlgVillage } from '../../../hooks/useSlgVillage'
import { UNLOCK_STAGE_LABELS } from '../../../types/slgVillage'
import { btnOutline, btnPrimary, cardClass } from '../../../styles/theme'
import { MotionHubVillageScene } from '../pixel/MotionHubVillageScene'

type Props = {
  memberId: string
  refreshToken?: number
}

function villageErrorMessage(err: unknown): string {
  const msg = formatSupabaseError(err)
  if (msg.includes('INSUFFICIENT_ACORNS')) {
    return '도토리가 부족해요. 운동으로 성장치를 쌓으면 도토리도 함께 모여요.'
  }
  if (msg.includes('SLG_STAGE_REQUIRED')) {
    return '운동나무가 더 자라야 이 시설을 발전시킬 수 있어요.'
  }
  return msg
}

type SlotStatus = 'locked' | 'ready' | 'built' | 'maxed'

function slotStatus(slot: {
  is_unlocked: boolean
  is_built: boolean
  next_upgrade_cost: number | null
  level: number
  max_level: number
}): SlotStatus {
  if (!slot.is_unlocked) return 'locked'
  if (!slot.is_built) return 'ready'
  if (slot.next_upgrade_cost != null) return 'built'
  return 'maxed'
}

const STATUS_LABEL: Record<SlotStatus, string> = {
  locked: '운동나무 성장 대기',
  ready: '발전 가능',
  built: '운영 중',
  maxed: '최고 단계',
}

export function MemberVillageSection({ memberId, refreshToken = 0 }: Props) {
  const { state, loading, error, reload, setState } = useSlgVillage(
    memberId,
    refreshToken,
  )
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const nextActionSlot = useMemo(() => {
    if (!state) return null
    const ready = state.slots.find((s) => s.is_unlocked && !s.is_built)
    if (ready) return ready
    return (
      state.slots.find((s) => s.is_built && s.next_upgrade_cost != null) ?? null
    )
  }, [state])

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

  if (loading) {
    return (
      <div className={`${cardClass} p-6 text-center text-sm text-muted`}>
        마을 발전 현황을 불러오는 중…
      </div>
    )
  }

  if (error || !state) {
    return (
      <div className={`${cardClass} border-red-200 bg-red-50 p-4`}>
        <p className="text-sm font-medium text-red-800">
          {error ?? '마을 정보를 불러올 수 없습니다.'}
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

  const sceneSlots = state.slots.map((slot) => ({
    slot_key: slot.slot_key,
    sprite_key: slot.sprite_key,
    is_built: slot.is_built,
    is_unlocked: slot.is_unlocked,
    level: slot.level,
  }))

  const builtCount = state.slots.filter((s) => s.is_built).length

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="border-b border-gold/15 bg-charcoal px-4 py-3">
        <h3 className="text-sm font-bold text-cream">내 마을</h3>
        <p className="mt-0.5 text-xs text-cream/75">
          운동나무 {state.tree_stage_name} · 시설 {builtCount}/{state.slots.length}
        </p>
      </div>

      <div className="p-4">
        <p className="text-center text-sm leading-relaxed text-charcoal/90">
          운동의 결과로 자라난 세계예요.
          <br />
          <span className="text-muted">나무가 성장할수록 마을도 함께 커집니다.</span>
        </p>

        <div className="mt-4">
          <MotionHubVillageScene
            treeStageKey={state.tree_stage_key}
            slots={sceneSlots}
            selectedSlotKey={null}
          />
        </div>

        {nextActionSlot && (
          <div className="mt-4 rounded-xl border border-[#5A9E6F]/30 bg-[#5A9E6F]/8 px-4 py-3">
            <p className="text-xs font-semibold text-[#2d6a3e]">지금 할 수 있는 일</p>
            <p className="mt-1 text-sm font-bold text-charcoal">
              {!nextActionSlot.is_built
                ? `${nextActionSlot.title} 발전`
                : `${nextActionSlot.title} 강화 (Lv.${nextActionSlot.level + 1})`}
            </p>
            <p className="mt-1 text-xs text-muted">
              도토리 {(
                nextActionSlot.build_cost_now ??
                nextActionSlot.next_upgrade_cost ??
                0
              ).toLocaleString()}
              개 필요
            </p>
            <button
              type="button"
              className={`${btnPrimary} mt-3 w-full`}
              disabled={
                actionLoading ||
                state.current_acorns <
                  (nextActionSlot.build_cost_now ??
                    nextActionSlot.next_upgrade_cost ??
                    0)
              }
              onClick={() =>
                void runAction(async () => {
                  const next = !nextActionSlot.is_built
                    ? await buildSlgVillageSlot(memberId, nextActionSlot.slot_key)
                    : await upgradeSlgVillageSlot(memberId, nextActionSlot.slot_key)
                  setState(next)
                })
              }
            >
              {!nextActionSlot.is_built ? '마을 발전하기' : '시설 강화하기'}
            </button>
          </div>
        )}

        <ul className="mt-4 space-y-2">
          {state.slots.map((slot) => {
            const status = slotStatus(slot)
            return (
              <li
                key={slot.slot_key}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                  status === 'ready'
                    ? 'border-[#5A9E6F]/35 bg-[#5A9E6F]/5'
                    : 'border-gold/15 bg-white'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-charcoal">
                    {slot.title}
                    {slot.is_built && (
                      <span className="ml-1 text-xs font-medium text-[#5A9E6F]">
                        Lv.{slot.level}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {status === 'locked'
                      ? `${UNLOCK_STAGE_LABELS[slot.unlock_stage_key] ?? ''} 단계에 해금`
                      : STATUS_LABEL[status]}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    status === 'locked'
                      ? 'bg-charcoal/10 text-muted'
                      : status === 'ready'
                        ? 'bg-[#5A9E6F]/15 text-[#2d6a3e]'
                        : 'bg-gold/15 text-charcoal'
                  }`}
                >
                  {STATUS_LABEL[status]}
                </span>
              </li>
            )
          })}
        </ul>

        <p className="mt-3 text-center text-[11px] text-muted">
          보유 도토리 {state.current_acorns.toLocaleString()} · 운동으로 모은 마을 발전 재화
        </p>

        {actionError && (
          <p className="mt-2 text-center text-sm text-red-700">{actionError}</p>
        )}
      </div>
    </section>
  )
}
