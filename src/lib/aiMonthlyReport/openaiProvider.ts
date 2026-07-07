import type {
  AiMonthlyBusinessReport,
  AiMonthlyReportContext,
  AiMonthlyReportProvider,
} from '../../types/aiMonthlyReport'
import { buildMotionHubAiPayload } from './buildPayload'
import { RuleBasedAiMonthlyReportProvider } from './ruleBasedProvider'

const fallback = new RuleBasedAiMonthlyReportProvider()

/**
 * OpenAI 연동 provider.
 * API 키는 Supabase Edge Function 시크릿에서만 사용합니다.
 * 클라이언트에서는 규칙 기반 리포트를 생성합니다.
 */
export class OpenAiMonthlyReportProvider implements AiMonthlyReportProvider {
  readonly id = 'openai' as const

  async generate(context: AiMonthlyReportContext): Promise<AiMonthlyBusinessReport> {
    const report = fallback.generateSync(context)
    return { ...report, provider: 'openai' }
  }
}

export function getMotionHubAiUserMessage(context: AiMonthlyReportContext): string {
  const payload = buildMotionHubAiPayload(context)
  return JSON.stringify(payload, null, 2)
}

export { MOTIONHUB_AI_SYSTEM_PROMPT } from './motionHubAiPrompt'
