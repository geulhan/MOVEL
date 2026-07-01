import {
  learningAnalysisSchema,
  type LearningAnalysisResult,
  MAX_RETRIES,
} from './learningAnalysisSchema.ts'

const systemPrompt = await Deno.readTextFile(new URL('./prompts/system.md', import.meta.url))
const learningAnalysisPrompt = await Deno.readTextFile(
  new URL('./prompts/learning-analysis.md', import.meta.url),
)
const jsonSchemaPrompt = await Deno.readTextFile(new URL('./prompts/json-schema.md', import.meta.url))

function render(template: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    template,
  )
}

export function buildLearningAnalysisPrompt(input: {
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

  const system = [render(systemPrompt, variables), '', 'JSON Schema:', jsonSchemaPrompt].join('\n')
  const user = render(learningAnalysisPrompt, variables)

  return { system, user }
}

export async function callOpenAI(system: string, user: string): Promise<string> {
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

  if (!response.ok) {
    throw new Error(`OpenAI error: ${await response.text()}`)
  }

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

export async function runLearningAgent(input: {
  title: string
  body: string
  sourceUrl?: string | null
  memo?: string | null
}): Promise<{ result: LearningAnalysisResult; model: string }> {
  const { system, user } = buildLearningAnalysisPrompt(input)
  const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'
  let lastError = 'Unknown error'

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const raw = await callOpenAI(system, user)
      const parsed = learningAnalysisSchema.parse(JSON.parse(extractJson(raw)))
      return { result: parsed, model }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500))
      }
    }
  }

  throw new Error(`Learning Agent failed after ${MAX_RETRIES} attempts: ${lastError}`)
}
