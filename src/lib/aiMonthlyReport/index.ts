import type { BusinessAnalyticsSnapshot } from '../../types/businessAnalytics'
import type {
  AiMonthlyBusinessReport,
  AiMonthlyReportProvider,
  AiReportProviderId,
  MonthlyOperationalSignals,
} from '../../types/aiMonthlyReport'
import { buildAiMonthlyReportContext } from './buildContext'
import { RuleBasedAiMonthlyReportProvider } from './ruleBasedProvider'

const ruleBasedProvider = new RuleBasedAiMonthlyReportProvider()

export function createAiMonthlyReportProvider(
  id: AiReportProviderId = 'rule-based',
): AiMonthlyReportProvider {
  if (id === 'openai') {
    // 향후 OpenAI API 연동 시 이 분기에서 provider 교체
    return ruleBasedProvider
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
export { RuleBasedAiMonthlyReportProvider } from './ruleBasedProvider'
