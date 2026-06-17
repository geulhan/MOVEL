import { useMemo, useState } from 'react'
import {
  buildSlgVillageSlot,
  upgradeSlgVillageSlot,
} from '../../../api/slgVillage'
import { formatSupabaseError } from '../../../lib/errors'
import { useSlgVillage } from '../../../hooks/useSlgVillage'
import type { SlgVillageSlot } from '../../../types/slgVillage'
import {
  SLG_TIER_LABELS,
  UNLOCK_STAGE_LABELS,
  VILLAGE_UNLOCK_BY_STAGE,
} from '../../../types/slgVillage'
import { btnOutline, btnPrimary, cardClass } from '../../../styles/theme'
import { MotionHubVillageScene } from '../pixel/MotionHubVillageScene'
import { SlgVillagePixelSprite } from './SlgVillagePixelSprite'

type Props = {
  memberId: string
  refreshToken?: number
}

function villageErrorMessage(err: unknown): string {
  const msg = formatSupabaseError(err)
  if (msg.includes('INSUFFICIENT_ACORNS')) {
    return '도토리가 부족해요. 운동으로 성장치를 쌓고 도토리를 모아보세요!'
  }
  if (msg.includes('SLG_STAGE_REQUIRED')) {
    return '운동나무 단계가 더 올라가야 이 건물을 지을 수 있어요.'
  }
  if (msg.includes('SLG_SLOT_ALREADY_BUILT')) {
    return '이미 건설된 슬롯이에요.'
  }
  if (msg.includes('SLG_SLOT_NOT_BUILT')) {
    return '먼저 건물을 건설해 주세요.'
  }
  if (msg.includes('SLG_MAX_LEVEL')) {
    return '이 건물은 최대 레벨에 도달했어요.'
  }
  return msg
}

function builtCount(slots: SlgVillageSlot[]): number {
  return slots.filter((s) => s.is_built).length
}

export function MemberVillageSection({ memberId, refreshToken = 0 }: Props) {
  const { state, loading, error, reload, setState } = useSlgVillage(
    memberId,
    refreshToken,
  )
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const selectedSlot = useMemo(
    () => state?.slots.find((s) => s.slot_key === selectedSlotKey) ?? null,
    [state?.slots, selectedSlotKey],
  )

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
        MotionHub 마을을 불러오는 중…
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
          Supabase에서 migration_091_motionhub_village_v2.sql 실행 후 다시 시도해
          주세요.
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

  const built = builtCount(state.slots)
  const sceneSlots = state.slots.map((slot) => ({
    slot_key: slot.slot_key,
    sprite_key: slot.sprite_key,
    is_built: slot.is_built,
    is_unlocked: slot.is_unlocked,
    level: slot.level,
  }))

  return (
    <div className="space-y-4">
      <section className={`${cardClass} p-4`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-charcoal">마을 현황</h3>
            <p className="mt-0.5 text-xs text-muted">
              운동나무 {state.tree_stage_name} · 건물 {built}/{state.slots.length}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-right">
            <p className="text-[10px] font-semibold text-amber-800">도토리</p>
            <p className="text-lg font-bold tabular-nums text-amber-900">
              {state.current_acorns.toLocaleString()}
            </p>
            <p className="text-[10px] text-amber-700">마을 발전 재화</p>
          </div>
        </div>

        <p className="mt-3 rounded-lg bg-cream/80 px-3 py-2 text-xs leading-relaxed text-charcoal/85">
          운동으로 성장치를 쌓으면 운동나무가 자라고, 단계마다 새 건물 슬롯이
          열립니다. 도토리로 건설하고 업그레이드해 마을을 발전시켜 보세요.
        </p>

        <div className="mt-4">
          <MotionHubVillageScene
            treeStageKey={state.tree_stage_key}
            slots={sceneSlots}
            selectedSlotKey={selectedSlotKey}
            onSlotClick={setSelectedSlotKey}
          />
        </div>

        <p className="mt-2 text-center text-[11px] text-muted">
          슬롯을 탭해 건설·업그레이드하세요
        </p>
      </section>

      <section className={`${cardClass} p-4`}>
        <h3 className="text-base font-semibold text-charcoal">건물 · 업그레이드</h3>
        <p className="mt-1 text-xs text-muted">
          슬롯을 탭하거나 아래 목록에서 건설·업그레이드하세요
        </p>

        {selectedSlot && (
          <div className="mt-3 rounded-xl border border-gold/25 bg-cream/50 px-3 py-3">
            <div className="flex items-center gap-3">
              <SlgVillagePixelSprite spriteKey={selectedSlot.sprite_key} scale={2} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-charcoal">
                  {selectedSlot.title}
                  {selectedSlot.is_built && (
                    <span className="ml-1.5 text-xs font-medium text-[#5A9E6F]">
                      Lv.{selectedSlot.level}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">{selectedSlot.description}</p>
              </div>
            </div>

            {!selectedSlot.is_unlocked && (
              <p className="mt-2 text-xs text-gray-600">
                🔒{' '}
                {UNLOCK_STAGE_LABELS[selectedSlot.unlock_stage_key] ??
                  selectedSlot.unlock_stage_key}{' '}
                단계에서 해금
              </p>
            )}

            {selectedSlot.is_unlocked && !selectedSlot.is_built && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="text-xs text-amber-800">
                  건설 비용 🌰{' '}
                  {(selectedSlot.build_cost_now ?? selectedSlot.build_cost_acorns).toLocaleString()}
                </p>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={
                    actionLoading ||
                    state.current_acorns <
                      (selectedSlot.build_cost_now ?? selectedSlot.build_cost_acorns)
                  }
                  onClick={() =>
                    void runAction(async () => {
                      const next = await buildSlgVillageSlot(
                        memberId,
                        selectedSlot.slot_key,
                      )
                      setState(next)
                    })
                  }
                >
                  건설하기
                </button>
              </div>
            )}

            {selectedSlot.is_built && selectedSlot.next_upgrade_cost != null && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="text-xs text-amber-800">
                  업그레이드 비용 🌰{' '}
                  {selectedSlot.next_upgrade_cost.toLocaleString()} → Lv.
                  {selectedSlot.level + 1}
                </p>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={
                    actionLoading ||
                    state.current_acorns < selectedSlot.next_upgrade_cost
                  }
                  onClick={() =>
                    void runAction(async () => {
                      const next = await upgradeSlgVillageSlot(
                        memberId,
                        selectedSlot.slot_key,
                      )
                      setState(next)
                    })
                  }
                >
                  업그레이드
                </button>
              </div>
            )}

            {selectedSlot.is_built &&
              selectedSlot.next_upgrade_cost == null &&
              selectedSlot.level >= selectedSlot.max_level && (
                <p className="mt-2 text-xs font-medium text-[#5A9E6F]">
                  최대 레벨에 도달했습니다
                </p>
              )}
          </div>
        )}

        <ul className="mt-3 space-y-2">
          {state.slots.map((slot) => {
            const tierLabel = SLG_TIER_LABELS[slot.tier] ?? `T${slot.tier}`
            const unlockBuilding =
              VILLAGE_UNLOCK_BY_STAGE[slot.unlock_stage_key] ?? slot.title

            return (
              <li
                key={slot.slot_key}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 ${
                  slot.is_unlocked
                    ? 'border-gold/20 bg-white'
                    : 'border-gray-200 bg-gray-50/80'
                }`}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => setSelectedSlotKey(slot.slot_key)}
                >
                  <div className={slot.is_unlocked ? '' : 'opacity-40'}>
                    <SlgVillagePixelSprite spriteKey={slot.sprite_key} scale={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-charcoal">
                      {slot.title}
                      <span className="ml-1.5 text-[10px] font-medium text-muted">
                        {tierLabel}
                      </span>
                      {slot.is_built && (
                        <span className="ml-1 text-xs text-[#5A9E6F]">
                          Lv.{slot.level}
                        </span>
                      )}
                    </p>
                    {slot.is_unlocked ? (
                      <p className="text-xs text-muted">
                        {slot.is_built
                          ? slot.next_upgrade_cost != null
                            ? `업그레이드 🌰 ${slot.next_upgrade_cost.toLocaleString()}`
                            : '최대 레벨'
                          : `건설 🌰 ${(slot.build_cost_now ?? slot.build_cost_acorns).toLocaleString()}`}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600">
                        {UNLOCK_STAGE_LABELS[slot.unlock_stage_key]} 단계 해금 ·{' '}
                        {unlockBuilding}
                      </p>
                    )}
                  </div>
                </button>
                {slot.is_unlocked && !slot.is_built && (
                  <button
                    type="button"
                    className={btnOutline}
                    disabled={
                      actionLoading ||
                      state.current_acorns <
                        (slot.build_cost_now ?? slot.build_cost_acorns)
                    }
                    onClick={() =>
                      void runAction(async () => {
                        const next = await buildSlgVillageSlot(
                          memberId,
                          slot.slot_key,
                        )
                        setState(next)
                        setSelectedSlotKey(slot.slot_key)
                      })
                    }
                  >
                    건설
                  </button>
                )}
                {slot.is_built && slot.next_upgrade_cost != null && (
                  <button
                    type="button"
                    className={btnOutline}
                    disabled={
                      actionLoading ||
                      state.current_acorns < slot.next_upgrade_cost
                    }
                    onClick={() =>
                      void runAction(async () => {
                        const next = await upgradeSlgVillageSlot(
                          memberId,
                          slot.slot_key,
                        )
                        setState(next)
                        setSelectedSlotKey(slot.slot_key)
                      })
                    }
                  >
                    업그레이드
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        {actionError && (
          <p className="mt-3 text-sm text-red-700">{actionError}</p>
        )}
      </section>

      <section className={`${cardClass} p-4`}>
        <h3 className="text-base font-semibold text-charcoal">성장 단계별 해금</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {[
            { key: 'seed', label: '씨앗', unlock: '건물 없음' },
            { key: 'sprout', label: '새싹', unlock: '창고' },
            { key: 'small', label: '어린 나무', unlock: '벤치' },
            { key: 'large', label: '큰 나무', unlock: '광장' },
            { key: 'sakura', label: '벚꽃나무', unlock: '분수' },
          ].map((row) => {
            const isCurrent = state.tree_stage_key === row.key
            return (
              <li
                key={row.key}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  isCurrent
                    ? 'bg-[#5A9E6F]/10 font-semibold text-charcoal'
                    : 'text-charcoal/80'
                }`}
              >
                <span>{row.label}</span>
                <span className="text-xs text-muted">{row.unlock}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
