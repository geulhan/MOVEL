import { z } from 'zod'

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

export type PatternItemResult = z.output<typeof patternItemSchema>
export type PatternAnalysisResult = z.output<typeof patternAnalysisSchema>

export const PATTERN_CATEGORIES = [
  { key: 'title', field: 'title_patterns', label: 'Title' },
  { key: 'intro', field: 'intro_patterns', label: 'Intro' },
  { key: 'subheading', field: 'subheading_patterns', label: 'Subheading' },
  { key: 'emotion_words', field: 'emotion_word_patterns', label: 'Emotion Words' },
  { key: 'cta', field: 'cta_patterns', label: 'CTA' },
  { key: 'structure', field: 'structure_patterns', label: 'Structure' },
  { key: 'writing_style', field: 'writing_style_patterns', label: 'Writing Style' },
  { key: 'seo', field: 'seo_patterns', label: 'SEO' },
  { key: 'new_patterns', field: 'new_patterns', label: 'New Patterns' },
] as const

export type PatternCategoryKey = (typeof PATTERN_CATEGORIES)[number]['key']

export const PATTERN_PROMPT_VERSION = '1.0'
