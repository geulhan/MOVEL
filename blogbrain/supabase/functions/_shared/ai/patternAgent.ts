import {
  patternAnalysisSchema,
  type PatternAnalysisResult,
  MAX_RETRIES,
} from './patternAnalysisSchema.ts'

const systemPrompt = await Deno.readTextFile(
  new URL('./prompts/pattern-system.md', import.meta.url),
)
const analysisPrompt = await Deno.readTextFile(
  new URL('./prompts/pattern-analysis.md', import.meta.url),
)
const jsonSchemaPrompt = await Deno.readTextFile(
  new URL('./prompts/pattern-json-schema.md', import.meta.url),
)

export type PatternAgentContext = {
  projectId: string
  learningCount: number
  candidates: Array<Record<string, unknown>>
  analyses: Array<Record<string, unknown>>
  existingPatterns: Array<Record<string, unknown>>
}

function render(template: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    template,
  )
}

function buildPrompt(ctx: PatternAgentContext): { system: string; user: string } {
  const variables = {
    project_id: ctx.projectId,
    learning_count: String(ctx.learningCount),
    candidate_count: String(ctx.candidates.length),
    existing_pattern_count: String(ctx.existingPatterns.length),
    candidates_json: JSON.stringify(ctx.candidates.slice(0, 80), null, 2),
    analyses_json: JSON.stringify(ctx.analyses.slice(0, 30), null, 2),
    existing_patterns_json: JSON.stringify(ctx.existingPatterns.slice(0, 50), null, 2),
  }

  const system = [render(systemPrompt, variables), '', 'JSON Schema:', jsonSchemaPrompt].join('\n')
  const user = render(analysisPrompt, variables)

  return { system, user }
}

async function callOpenAI(system: string, user: string): Promise<string> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) throw new Error(`OpenAI error: ${await response.text()}`)

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty OpenAI response')
  return content
}

function extractJson(raw: string): string {
  const trimmed = raw.trim()
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch?.[1]) return fenceMatch[1].trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return trimmed
}

export async function runPatternAgent(
  ctx: PatternAgentContext,
): Promise<{ result: PatternAnalysisResult; model: string }> {
  const { system, user } = buildPrompt(ctx)
  const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'
  let lastError = 'Unknown error'

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const raw = await callOpenAI(system, user)
      const parsed = patternAnalysisSchema.parse(JSON.parse(extractJson(raw)))
      return { result: parsed, model }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500))
      }
    }
  }

  throw new Error(`Pattern Agent failed after ${MAX_RETRIES} attempts: ${lastError}`)
}
