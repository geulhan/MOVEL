import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

export const learningAnalysisSchema = z.object({
  title_pattern: z.string(),
  intro_pattern: z.string(),
  emotion_words: z.array(z.string()),
  entities: z.array(z.string()),
  brands: z.array(z.string()),
  keywords: z.array(z.string()),
  category: z.string(),
  cta: z.string(),
  writing_style: z.string(),
  paragraph_length: z.object({
    average_chars: z.number().optional(),
    description: z.string(),
  }),
  seo_keywords: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  new_patterns: z.object({
    new_words: z.array(z.string()),
    new_expressions: z.array(z.string()),
  }),
})

export type LearningAnalysisResult = z.infer<typeof learningAnalysisSchema>

export const MAX_RETRIES = 3
export const PROMPT_VERSION = '1.0'
