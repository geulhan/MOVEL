import { BaseAgent } from '@/ai/agents/BaseAgent'
import type { AIProvider } from '@/ai/core/AIProvider'
import { PromptBuilder } from '@/ai/core/PromptBuilder'
import { parseWithRetry } from '@/ai/core/ResultParser'
import {
  learningAnalysisSchema,
  type LearningAnalysisResult,
} from '@/ai/schemas/learningAnalysisSchema'
import type { LearningAgentInput } from '@/ai/types'

export class LearningAgent extends BaseAgent<LearningAgentInput, LearningAnalysisResult> {
  readonly name = 'learning_agent' as const

  constructor(private readonly provider: AIProvider) {
    super()
  }

  async run(input: LearningAgentInput): Promise<LearningAnalysisResult> {
    const { system, user } = PromptBuilder.buildLearningAnalysisPrompt(input)

    return parseWithRetry(async () => {
      const response = await this.provider.analyze({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        jsonMode: true,
        temperature: 0.2,
      })

      return response.content
    }, learningAnalysisSchema)
  }
}
