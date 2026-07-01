import { BaseAgent } from '@/ai/agents/BaseAgent'
import { LearningAgent } from '@/ai/agents/LearningAgent'
import { PatternAgent } from '@/ai/agents/PatternAgent'
import type { AIProvider } from '@/ai/core/AIProvider'
import { createOpenAIProvider } from '@/ai/core/providers/OpenAIProvider'
import type { AgentName, LearningAgentInput } from '@/ai/types'
import type { PatternAgentInput } from '@/ai/agents/PatternAgent'
import type { LearningAnalysisResult } from '@/ai/schemas/learningAnalysisSchema'
import type { PatternAnalysisResult } from '@/ai/schemas/patternAnalysisSchema'

export class AgentManager {
  private readonly agents = new Map<AgentName, BaseAgent<unknown, unknown>>()

  register<TInput, TOutput>(agent: BaseAgent<TInput, TOutput>): void {
    this.agents.set(agent.name, agent as BaseAgent<unknown, unknown>)
  }

  getAgent<TInput, TOutput>(name: AgentName): BaseAgent<TInput, TOutput> | undefined {
    return this.agents.get(name) as BaseAgent<TInput, TOutput> | undefined
  }

  async runLearningAgent(input: LearningAgentInput): Promise<LearningAnalysisResult> {
    const agent = this.getAgent<LearningAgentInput, LearningAnalysisResult>('learning_agent')
    if (!agent) {
      throw new Error('LearningAgent is not registered')
    }
    return agent.run(input)
  }

  async runPatternAgent(input: PatternAgentInput): Promise<PatternAnalysisResult> {
    const agent = this.getAgent<PatternAgentInput, PatternAnalysisResult>('pattern_agent')
    if (!agent) {
      throw new Error('PatternAgent is not registered')
    }
    return agent.run(input)
  }

  listAgents(): AgentName[] {
    return [...this.agents.keys()]
  }
}

export function createAgentManager(provider?: AIProvider): AgentManager {
  const manager = new AgentManager()

  const aiProvider =
    provider ??
    createOpenAIProvider(
      import.meta.env.VITE_OPENAI_API_KEY ?? '',
      import.meta.env.VITE_OPENAI_MODEL ?? 'gpt-4o-mini',
    )

  manager.register(new LearningAgent(aiProvider))
  manager.register(new PatternAgent(aiProvider))

  return manager
}

export const agentManager = createAgentManager()
