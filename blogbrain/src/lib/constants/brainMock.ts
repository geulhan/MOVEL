import type { ProjectBrain } from '@/types/database'
import { calculateBrainScore } from '@/features/brain/types'

export type BrainDashboardStats = {
  brainScore: number
  learningCount: number
  knowledgeCount: number
  patternCount: number
  sourceCount: number
  relationshipCount: number
  lastLearningAt: string | null
  currentVersion: string
}

export function resolveBrainDashboardStats(brain: ProjectBrain | null): BrainDashboardStats {
  if (!brain) {
    return {
      brainScore: 0,
      learningCount: 0,
      knowledgeCount: 0,
      patternCount: 0,
      sourceCount: 0,
      relationshipCount: 0,
      lastLearningAt: null,
      currentVersion: '1.0',
    }
  }

  const score = calculateBrainScore({
    learning: brain.learning_count,
    knowledge: brain.knowledge_count,
    relationships: brain.relationship_count ?? 0,
    sources: brain.source_count ?? 0,
  })

  return {
    brainScore: brain.brain_score > 0 ? brain.brain_score : score,
    learningCount: brain.learning_count,
    knowledgeCount: brain.knowledge_count,
    patternCount: brain.pattern_count,
    sourceCount: brain.source_count ?? 0,
    relationshipCount: brain.relationship_count ?? 0,
    lastLearningAt: brain.last_learning_at,
    currentVersion: brain.current_version_label,
  }
}
