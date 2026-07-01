import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

export const patternItemSchema = z.object({
  label: z.string(),
  formula: z.string().optional().default(''),
  description: z.string().optional().default(''),
  examples: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  occurrence_count: z.number().int().min(0).default(1),
  source_candidate_ids: z.array(z.string()).default([]),
})

export const patternChangeSchema = z.object({
  label: z.string(),
  category: z.string().optional().default(''),
  reason: z.string().optional().default(''),
})

export const patternAnalysisSchema = z.object({
  title_patterns: z.array(patternItemSchema).default([]),
  intro_patterns: z.array(patternItemSchema).default([]),
  subheading_patterns: z.array(patternItemSchema).default([]),
  emotion_word_patterns: z.array(patternItemSchema).default([]),
  cta_patterns: z.array(patternItemSchema).default([]),
  structure_patterns: z.array(patternItemSchema).default([]),
  writing_style_patterns: z.array(patternItemSchema).default([]),
  seo_patterns: z.array(patternItemSchema).default([]),
  new_patterns: z.array(patternItemSchema).default([]),
  strengthened_patterns: z.array(patternChangeSchema).default([]),
  removed_or_weakened_patterns: z.array(patternChangeSchema).default([]),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
})

export type PatternAnalysisResult = z.infer<typeof patternAnalysisSchema>
export type PatternItemResult = z.infer<typeof patternItemSchema>

export const PATTERN_FIELD_TO_CATEGORY: Record<string, string> = {
  title_patterns: 'title',
  intro_patterns: 'intro',
  subheading_patterns: 'subheading',
  emotion_word_patterns: 'emotion_words',
  cta_patterns: 'cta',
  structure_patterns: 'structure',
  writing_style_patterns: 'writing_style',
  seo_patterns: 'seo',
  new_patterns: 'new_patterns',
}

export const MAX_RETRIES = 3
export const PATTERN_PROMPT_VERSION = '1.0'
