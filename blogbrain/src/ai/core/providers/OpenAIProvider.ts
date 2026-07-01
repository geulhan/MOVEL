import type { AIProvider } from '@/ai/core/AIProvider'
import type {
  AIAnalyzeRequest,
  AIAnalyzeResponse,
  AIGenerateRequest,
  AIGenerateResponse,
} from '@/ai/types'

type OpenAIProviderOptions = {
  apiKey: string
  model?: string
}

type OpenAIChatResponse = {
  choices: Array<{ message: { content: string } }>
  model: string
  usage?: { prompt_tokens: number; completion_tokens: number }
}

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai' as const
  private readonly apiKey: string
  private readonly model: string

  constructor(options: OpenAIProviderOptions) {
    this.apiKey = options.apiKey
    this.model = options.model ?? 'gpt-4o-mini'
  }

  async analyze(request: AIAnalyzeRequest): Promise<AIAnalyzeResponse> {
    return this.chat(request, true)
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const response = await this.chat(
      { ...request, jsonMode: false },
      false,
    )
    return response
  }

  private async chat(
    request: AIAnalyzeRequest,
    jsonMode: boolean,
  ): Promise<AIAnalyzeResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 4096,
    }

    if (jsonMode) {
      body.response_format = { type: 'json_object' }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`)
    }

    const data = (await response.json()) as OpenAIChatResponse
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('OpenAI returned empty content')
    }

    return {
      content,
      model: data.model,
      provider: 'openai',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
          }
        : undefined,
    }
  }
}

export function createOpenAIProvider(apiKey: string, model?: string): AIProvider {
  return new OpenAIProvider({ apiKey, model })
}
