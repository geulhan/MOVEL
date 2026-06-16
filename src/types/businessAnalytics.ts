export type FixedCosts = {
  rent: number
  maintenance: number
  cardFee: number
  telecom: number
  other: number
}

export type BusinessAnalyticsSettings = {
  trainerSettlementRate: number
  ownerTrainerId: string | null
  fixedCosts: FixedCosts
  taxReserveRate: number
  facilityReserveRate: number
}

export const DEFAULT_FIXED_COSTS: FixedCosts = {
  rent: 0,
  maintenance: 0,
  cardFee: 0,
  telecom: 0,
  other: 0,
}

export const DEFAULT_BUSINESS_ANALYTICS_SETTINGS: BusinessAnalyticsSettings = {
  trainerSettlementRate: 50,
  ownerTrainerId: null,
  fixedCosts: { ...DEFAULT_FIXED_COSTS },
  taxReserveRate: 10,
  facilityReserveRate: 5,
}

export type MonthlyReportPoint = {
  year: number
  month: number
  label: string
  cashRevenue: number
  recognizedRevenue: number
  netProfit: number
  renewalRate: number
  refundExposureRate: number
  activeMembers: number
}

export type CenterHealthGrade = 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D'

export type BusinessAnalyticsSnapshot = {
  period: { year: number; month: number; label: string }
  cashRevenue: number
  centerPassRecognized: number
  ptRecognized: number
  totalRecognized: number
  centerPassPrepaid: number
  ptPrepaid: number
  totalPrepaid: number
  centerPassRefundRisk: number
  ptRefundRisk: number
  totalRefundRisk: number
  centerPassRefundExpired: number
  ptRefundExpired: number
  totalRefundExpired: number
  ptRefundDaysPerSession: number
  trainerPayroll: number
  centerPtShare: number
  averageSessionPrice: number
  registeredPtTotalAmount: number
  registeredPtTotalSessions: number
  registeredMemberCount: number
  ownerSessions: number
  ownerPayroll: number
  fixedCostsTotal: number
  taxReserve: number
  facilityReserve: number
  netProfit: number
  ownerDependencyPercent: number
  ptDependencyPercent: number
  fixedCostRatioPercent: number
  healthGrade: CenterHealthGrade
  healthScore: number
  monthlyReport: MonthlyReportPoint[]
}
