import type { Trainer } from '../types/database'

export function clampSettlementRate(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function resolveTrainerSettlementRate(
  trainerId: string | null | undefined,
  trainers: Array<Pick<Trainer, 'id' | 'settlement_rate'>>,
  defaultRate: number,
): number {
  const fallback = clampSettlementRate(defaultRate)
  if (!trainerId) return fallback

  const trainer = trainers.find((item) => item.id === trainerId)
  if (trainer?.settlement_rate == null) return fallback
  return clampSettlementRate(trainer.settlement_rate)
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
  trainers: Array<Pick<Trainer, 'id' | 'settlement_rate'>>,
): boolean {
  if (!trainerId) return true
  const trainer = trainers.find((item) => item.id === trainerId)
  return trainer?.settlement_rate == null
}
