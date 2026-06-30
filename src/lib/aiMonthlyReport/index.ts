import type { BusinessAnalyticsSnapshot } from '../../types/businessAnalytics'
import type {
  AiMonthlyBusinessReport,
  AiMonthlyReportProvider,
  AiReportProviderId,
  MonthlyOperationalSignals,
} from '../../types/aiMonthlyReport'
import { buildAiMonthlyReportContext } from './buildContext'
import { OpenAiMonthlyReportProvider } from './openaiProvider'
import { RuleBasedAiMonthlyReportProvider } from './ruleBasedProvider'

const ruleBasedProvider = new RuleBasedAiMonthlyReportProvider()
const openaiProvider = new OpenAiMonthlyReportProvider()

export function createAiMonthlyReportProvider(
  id: AiReportProviderId = 'rule-based',
): AiMonthlyReportProvider {
  if (id === 'openai') {
    return openaiProvider
  }
  return ruleBasedProvider
}

export async function generateAiMonthlyBusinessReport(
  snapshot: BusinessAnalyticsSnapshot,
  operational: MonthlyOperationalSignals,
  priorOperational: MonthlyOperationalSignals | null,
  providerId: AiReportProviderId = 'rule-based',
): Promise<AiMonthlyBusinessReport> {
  const provider = createAiMonthlyReportProvider(providerId)
  const context = buildAiMonthlyReportContext(
    snapshot,
    operational,
    priorOperational,
  )
  return provider.generate(context)
}

export function generateAiMonthlyBusinessReportSync(
  snapshot: BusinessAnalyticsSnapshot,
  operational: MonthlyOperationalSignals,
  priorOperational: MonthlyOperationalSignals | null,
  providerId: AiReportProviderId = 'rule-based',
): AiMonthlyBusinessReport {
  const provider = createAiMonthlyReportProvider(providerId)
  if (provider instanceof RuleBasedAiMonthlyReportProvider) {
    const context = buildAiMonthlyReportContext(
      snapshot,
      operational,
      priorOperational,
    )
    return provider.generateSync(context)
  }
  throw new Error('Sync generation is only supported for rule-based provider')
}

export { buildAiMonthlyReportContext } from './buildContext'
export { buildMotionHubAiPayload, detectDataGaps } from './buildPayload'
export { MOTIONHUB_AI_SYSTEM_PROMPT } from './motionHubAiPrompt'
export { OpenAiMonthlyReportProvider } from './openaiProvider'
export { RuleBasedAiMonthlyReportProvider } from './ruleBasedProvider'
