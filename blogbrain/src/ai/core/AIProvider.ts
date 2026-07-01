import type {
  AIAnalyzeRequest,
  AIAnalyzeResponse,
  AIGenerateRequest,
  AIGenerateResponse,
  AIProviderName,
} from '@/ai/types'

export interface AIProvider {
  readonly name: AIProviderName
  analyze(request: AIAnalyzeRequest): Promise<AIAnalyzeResponse>
  generate(request: AIGenerateRequest): Promise<AIGenerateResponse>
}
