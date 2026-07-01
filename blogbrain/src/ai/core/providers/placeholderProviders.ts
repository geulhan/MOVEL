import type { AIProvider } from '@/ai/core/AIProvider'
import type {
  AIAnalyzeRequest,
  AIAnalyzeResponse,
  AIGenerateRequest,
  AIGenerateResponse,
} from '@/ai/types'

function notImplemented(provider: string): never {
  throw new Error(`${provider} provider is not implemented yet`)
}

/** Placeholder — implement in a future sprint */
export class ClaudeProvider implements AIProvider {
  readonly name = 'claude' as const
  analyze(_request: AIAnalyzeRequest): Promise<AIAnalyzeResponse> {
    return Promise.reject(notImplemented('Claude'))
  }
  generate(_request: AIGenerateRequest): Promise<AIGenerateResponse> {
    return Promise.reject(notImplemented('Claude'))
  }
}

/** Placeholder — implement in a future sprint */
export class GeminiProvider implements AIProvider {
  readonly name = 'gemini' as const
  analyze(_request: AIAnalyzeRequest): Promise<AIAnalyzeResponse> {
    return Promise.reject(notImplemented('Gemini'))
  }
  generate(_request: AIGenerateRequest): Promise<AIGenerateResponse> {
    return Promise.reject(notImplemented('Gemini'))
  }
}

/** Placeholder — implement in a future sprint */
export class OpenRouterProvider implements AIProvider {
  readonly name = 'openrouter' as const
  analyze(_request: AIAnalyzeRequest): Promise<AIAnalyzeResponse> {
    return Promise.reject(notImplemented('OpenRouter'))
  }
  generate(_request: AIGenerateRequest): Promise<AIGenerateResponse> {
    return Promise.reject(notImplemented('OpenRouter'))
  }
}
