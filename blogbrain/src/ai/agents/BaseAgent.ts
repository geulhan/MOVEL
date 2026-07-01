import type { AgentName } from '@/ai/types'

export abstract class BaseAgent<TInput, TOutput> {
  abstract readonly name: AgentName

  abstract run(input: TInput): Promise<TOutput>
}
