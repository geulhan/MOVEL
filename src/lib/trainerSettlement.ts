import type { Trainer, TrainerSettlementMode } from '../types/database'

export function clampSettlementRate(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function clampSettlementFixedAmount(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.round(value))
}

export function resolveTrainerSettlementMode(
  trainerId: string | null | undefined,
  trainers: Array<Pick<Trainer, 'id' | 'settlement_mode'>>,
): TrainerSettlementMode {
  if (!trainerId) return 'percent'
  const trainer = trainers.find((item) => item.id === trainerId)
  return trainer?.settlement_mode === 'fixed' ? 'fixed' : 'percent'
}

export function resolveTrainerSettlementRate(
  trainerId: string | null | undefined,
  trainers: Array<Pick<Trainer, 'id' | 'settlement_rate' | 'settlement_mode'>>,
  defaultRate: number,
): number {
  const fallback = clampSettlementRate(defaultRate)
  if (!trainerId) return fallback

  const trainer = trainers.find((item) => item.id === trainerId)
  if (!trainer || trainer.settlement_mode === 'fixed') return fallback
  if (trainer.settlement_rate == null) return fallback
  return clampSettlementRate(trainer.settlement_rate)
}

export function resolveTrainerFixedAmount(
  trainerId: string | null | undefined,
  trainers: Array<Pick<Trainer, 'id' | 'settlement_fixed_amount' | 'settlement_mode'>>,
): number {
  if (!trainerId) return 0
  const trainer = trainers.find((item) => item.id === trainerId)
  if (!trainer || trainer.settlement_mode !== 'fixed') return 0
  if (trainer.settlement_fixed_amount == null) return 0
  return clampSettlementFixedAmount(trainer.settlement_fixed_amount)
}

export function calculateTrainerPay(input: {
  gross: number
  sessionCount: number
  trainerId: string | null
  trainers: Array<
    Pick<
      Trainer,
      'id' | 'settlement_mode' | 'settlement_rate' | 'settlement_fixed_amount'
    >
  >
  defaultRate: number
}): {
  trainerPay: number
  centerShare: number
  settlementMode: TrainerSettlementMode
  settlementRate: number | null
  settlementFixedAmount: number | null
} {
  const mode = resolveTrainerSettlementMode(input.trainerId, input.trainers)

  if (mode === 'fixed') {
    const fixedAmount = resolveTrainerFixedAmount(input.trainerId, input.trainers)
    const trainerPay = fixedAmount * input.sessionCount
    const gross = Math.max(0, input.gross)
    return {
      trainerPay,
      centerShare: gross - trainerPay,
      settlementMode: 'fixed',
      settlementRate: null,
      settlementFixedAmount: fixedAmount,
    }
  }

  const settlementRate = resolveTrainerSettlementRate(
    input.trainerId,
    input.trainers,
    input.defaultRate,
  )
  const trainerPay = Math.round(input.gross * (settlementRate / 100))
  return {
    trainerPay,
    centerShare: input.gross - trainerPay,
    settlementMode: 'percent',
    settlementRate,
    settlementFixedAmount: null,
  }
}

export function formatSettlementLabel(input: {
  settlementMode: TrainerSettlementMode
  settlementRate: number | null
  settlementFixedAmount: number | null
  defaultRate: number
}): string {
  if (input.settlementMode === 'fixed') {
    const amount = input.settlementFixedAmount ?? 0
    return `${amount.toLocaleString('ko-KR')}원/회`
  }
  const rate = input.settlementRate ?? input.defaultRate
  return `${rate}%`
}

export function resolveTrainerIdByName(
  trainerName: string | null | undefined,
  trainers: Array<Pick<Trainer, 'id' | 'name'>>,
): string | null {
  const trimmed = trainerName?.trim()
  if (!trimmed) return null
  return trainers.find((trainer) => trainer.name.trim() === trimmed)?.id ?? null
}

export function usesDefaultSettlementRate(
  trainerId: string | null | undefined,
  trainers: Array<Pick<Trainer, 'id' | 'settlement_rate' | 'settlement_mode'>>,
): boolean {
  if (!trainerId) return true
  const trainer = trainers.find((item) => item.id === trainerId)
  if (!trainer || trainer.settlement_mode === 'fixed') return false
  return trainer.settlement_rate == null
}
