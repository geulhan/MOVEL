import { BaseAgent } from '@/ai/agents/BaseAgent'
import type { AIProvider } from '@/ai/core/AIProvider'
import { PromptBuilder } from '@/ai/core/PromptBuilder'
import { parseWithRetry } from '@/ai/core/ResultParser'
import {
  patternAnalysisSchema,
  type PatternAnalysisResult,
} from '@/ai/schemas/patternAnalysisSchema'

export type PatternAgentInput = {
  projectId: string
  learningCount: number
  candidates: Array<{
    id: string
    category: string
    label: string
    value: Record<string, unknown>
    confidence: number | null
  }>
  analyses: Array<{
    id: string
    title_pattern?: string
    intro_pattern?: string
    writing_style?: string
    category?: string
    confidence?: number
  }>
  existingPatterns: Array<{
    category: string
    label: string
    formula: string | null
    confidence: number | null
  }>
}

import patternSystemPrompt from '@/ai/prompts/pattern-system.md?raw'
import patternAnalysisPrompt from '@/ai/prompts/pattern-analysis.md?raw'
import patternJsonSchemaPrompt from '@/ai/prompts/pattern-json-schema.md?raw'

function buildPatternPrompt(input: PatternAgentInput): { system: string; user: string } {
  const variables = {
    project_id: input.projectId,
    learning_count: String(input.learningCount),
    candidate_count: String(input.candidates.length),
    existing_pattern_count: String(input.existingPatterns.length),
    candidates_json: JSON.stringify(input.candidates.slice(0, 80), null, 2),
    analyses_json: JSON.stringify(input.analyses.slice(0, 30), null, 2),
    existing_patterns_json: JSON.stringify(input.existingPatterns.slice(0, 50), null, 2),
  }

  const render = (template: string) =>
    Object.entries(variables).reduce(
      (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
      template,
    )

  const system = [render(patternSystemPrompt), '', 'JSON Schema:', patternJsonSchemaPrompt].join('\n')
  const user = render(patternAnalysisPrompt)

  return { system, user }
}

export class PatternAgent extends BaseAgent<PatternAgentInput, PatternAnalysisResult> {
  readonly name = 'pattern_agent' as const

  constructor(private readonly provider: AIProvider) {
    super()
  }

  async run(input: PatternAgentInput): Promise<PatternAnalysisResult> {
    const { system, user } = buildPatternPrompt(input)

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
    }, patternAnalysisSchema)
  }
}

// Re-export PromptBuilder for pattern-specific builds if needed elsewhere
export { PromptBuilder }
