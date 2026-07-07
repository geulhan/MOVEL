import type { BusinessAnalyticsSettings, BusinessAnalyticsSnapshot } from './businessAnalytics'
import type { Member, Trainer } from './database'
import type { FeedAction } from './actionEngine'

export type AssistantMemberInsight = {
  memberId: string
  name: string
  phone: string
  status: Member['status']
  remainingSessions: number
  totalSessions: number
  trainerName: string | null
  lastPaymentAt: string | null
  lastPaymentAmount: number | null
  lastAttendanceAt: string | null
  scheduledThisMonth: number
  completedThisMonth: number
  noShowThisMonth: number
  attendanceRateThisMonth: number | null
  estimatedRefundRisk: number
  isRenewalTarget: boolean
  expiresAt: string | null
}

export type AssistantTrainerInsight = {
  trainerId: string
  trainerName: string
  memberCount: number
  newMembersThisMonth: number
  ptRecognizedRevenue: number
  completedSessions: number
  scheduledSessions: number
  attendanceRate: number | null
  renewalTargetCount: number
  activeRenewalTargets: number
  renewalRate: number | null
  cashRevenueThisMonth: number
}

export type AssistantExecutableAction = {
  label: string
  href?: string
  kind?: 'link' | 'send_renewal'
  memberId?: string
}

export type MotionHubAssistantContext = {
  snapshot: BusinessAnalyticsSnapshot
  settings: BusinessAnalyticsSettings
  trainers: Trainer[]
  members: AssistantMemberInsight[]
  trainerInsights: AssistantTrainerInsight[]
  periodLabel: string
  todayActions?: FeedAction[]
}

export type AssistantAnswerSection = {
  title: string
  lines: string[]
}

export type MotionHubAssistantAnswer = {
  intent: string
  headline: string
  sections: AssistantAnswerSection[]
  evidenceNote?: string
  insufficientData?: string[]
  actions?: AssistantExecutableAction[]
}
