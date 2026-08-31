/** 카드 결제액(부가세 포함)에서 공급가액만 추출 */
export function excludeVatFromPaymentAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  return Math.round((amount * 10) / 11)
}

export function paymentSettlementBaseAmount(
  amount: number,
  excludeVatFromSettlement: boolean,
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  return excludeVatFromSettlement ? excludeVatFromPaymentAmount(amount) : amount
}

export function paymentPerSessionBaseAmount(
  amount: number,
  sessions: number,
  excludeVatFromSettlement: boolean,
): number {
  if (!Number.isFinite(sessions) || sessions <= 0) return 0
  return paymentSettlementBaseAmount(amount, excludeVatFromSettlement) / sessions
}

export type PtSettlementOptions = {
  excludeVatFromSettlement?: boolean
}

export function isPtVatExcluded(options?: PtSettlementOptions): boolean {
  return options?.excludeVatFromSettlement === true
}
