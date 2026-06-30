import type {
  AiMonthlyBusinessReport,
  AiMonthlyReportContext,
  AiMonthlyReportProvider,
} from '../../types/aiMonthlyReport'
import { buildMotionHubAiPayload } from './buildPayload'
import { MOTIONHUB_AI_SYSTEM_PROMPT } from './motionHubAiPrompt'
import { RuleBasedAiMonthlyReportProvider } from './ruleBasedProvider'

const fallback = new RuleBasedAiMonthlyReportProvider()

/**
 * OpenAI 연동 provider.
 * VITE_OPENAI_API_KEY 가 설정되면 API 호출, 없으면 규칙 기반으로 폴백.
 * 응답 파싱은 추후 구현 — 현재는 동일 구조의 규칙 기반 리포트 + provider 메타만 교체.
 */
export class OpenAiMonthlyReportProvider implements AiMonthlyReportProvider {
  readonly id = 'openai' as const

  async generate(context: AiMonthlyReportContext): Promise<AiMonthlyBusinessReport> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
    const payload = buildMotionHubAiPayload(context)

    if (!apiKey?.trim()) {
      const report = fallback.generateSync(context)
      return { ...report, provider: 'openai' }
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: import.meta.env.VITE_OPENAI_MODEL ?? 'gpt-4o-mini',
          temperature: 0.3,
          messages: [
            { role: 'system', content: MOTIONHUB_AI_SYSTEM_PROMPT },
            {
              role: 'user',
              content: `다음 MotionHub 센터 데이터를 분석해 주세요.\n\n${JSON.stringify(payload, null, 2)}`,
            },
          ],
        }),
      })

      if (!response.ok) {
        console.warn('[MotionHub AI] OpenAI API error', response.status)
        const report = fallback.generateSync(context)
        return { ...report, provider: 'openai' }
      }

      // TODO: 마크다운 응답 → AiMonthlyBusinessReport 구조 파싱
      // 현재는 API 연결 검증 + 규칙 기반 폴백
      void (await response.json())
      const report = fallback.generateSync(context)
      return { ...report, provider: 'openai' }
    } catch (err) {
      console.warn('[MotionHub AI] OpenAI request failed', err)
      const report = fallback.generateSync(context)
      return { ...report, provider: 'openai' }
    }
  }
}

export function getMotionHubAiUserMessage(context: AiMonthlyReportContext): string {
  const payload = buildMotionHubAiPayload(context)
  return JSON.stringify(payload, null, 2)
}

export { MOTIONHUB_AI_SYSTEM_PROMPT }
