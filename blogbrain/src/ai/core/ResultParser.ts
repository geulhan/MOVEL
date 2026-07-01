import { z } from 'zod'
import {
  learningAnalysisSchema,
  type LearningAnalysisResult,
} from '@/ai/schemas/learningAnalysisSchema'
import { MAX_AGENT_RETRIES } from '@/ai/types'

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export class ResultParser {
  static extractJson(raw: string): string {
    const trimmed = raw.trim()

    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fenceMatch?.[1]) {
      return fenceMatch[1].trim()
    }

    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return trimmed.slice(start, end + 1)
    }

    return trimmed
  }

  static parse<T>(
    raw: string,
    schema: z.ZodType<T>,
  ): ParseResult<T> {
    try {
      const jsonText = ResultParser.extractJson(raw)
      const parsed: unknown = JSON.parse(jsonText)
      const data = schema.parse(parsed)
      return { success: true, data }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parse error'
      return { success: false, error: message }
    }
  }

  static parseLearningAnalysis(raw: string): ParseResult<LearningAnalysisResult> {
    return ResultParser.parse(raw, learningAnalysisSchema)
  }
}

export async function parseWithRetry<S extends z.ZodTypeAny>(
  fetchRaw: () => Promise<string>,
  schema: S,
  maxRetries: number = MAX_AGENT_RETRIES,
): Promise<z.output<S>> {
  let lastError = 'Unknown error'

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const raw = await fetchRaw()
    const result = ResultParser.parse(raw, schema)

    if (result.success) {
      return result.data
    }

    lastError = result.error

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 500))
    }
  }

  throw new Error(`JSON validation failed after ${maxRetries} attempts: ${lastError}`)
}
