import systemPrompt from '@/ai/prompts/system.md?raw'
import learningAnalysisPrompt from '@/ai/prompts/learning-analysis.md?raw'
import jsonSchemaPrompt from '@/ai/prompts/json-schema.md?raw'

export type PromptTemplateName = 'system' | 'learning-analysis' | 'json-schema'

const TEMPLATES: Record<PromptTemplateName, string> = {
  system: systemPrompt,
  'learning-analysis': learningAnalysisPrompt,
  'json-schema': jsonSchemaPrompt,
}

export class PromptBuilder {
  static getTemplate(name: PromptTemplateName): string {
    return TEMPLATES[name]
  }

  static render(template: string, variables: Record<string, string>): string {
    return Object.entries(variables).reduce(
      (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
      template,
    )
  }

  static buildLearningAnalysisPrompt(input: {
    title: string
    body: string
    sourceUrl?: string | null
    memo?: string | null
  }): { system: string; user: string } {
    const variables = {
      title: input.title,
      body: input.body,
      source_url: input.sourceUrl ?? '(none)',
      memo: input.memo ?? '(none)',
    }

    const system = [
      PromptBuilder.render(TEMPLATES.system, variables),
      '',
      'JSON Schema:',
      TEMPLATES['json-schema'],
    ].join('\n')

    const user = PromptBuilder.render(TEMPLATES['learning-analysis'], variables)

    return { system, user }
  }
}
