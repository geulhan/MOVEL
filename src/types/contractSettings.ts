export type ContractSettings = {
  /** PT 1회당 환불 가능 기간(일). 환불 기준일 = 결제일 + 등록세션 × 이 값 */
  ptRefundDaysPerSession: number
}

export const DEFAULT_CONTRACT_SETTINGS: ContractSettings = {
  ptRefundDaysPerSession: 4,
}
