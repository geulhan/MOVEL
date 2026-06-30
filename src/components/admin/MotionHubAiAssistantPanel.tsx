import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchMotionHubAssistantContext } from '../../api/motionHubAiAssistant'
import {
  answerMotionHubQuestion,
  formatAssistantAnswer,
} from '../../lib/motionHubAiAssistant/answerEngine'
import { SUGGESTED_QUESTIONS } from '../../lib/motionHubAiAssistant/systemPrompt'
import type { MotionHubAssistantAnswer } from '../../types/motionHubAiAssistant'
import { btnGold, btnOutline, cardClass, inputClass } from '../../styles/theme'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  answer?: MotionHubAssistantAnswer
}

type Props = {
  year: number
  month: number
}

function AnswerBlocks({ answer }: { answer: MotionHubAssistantAnswer }) {
  return (
    <div className="space-y-3">
      <p className="font-semibold text-charcoal">{answer.headline}</p>
      {answer.sections.map((section) => (
        <div key={section.title} className="rounded-lg border border-charcoal/8 bg-white/80 px-3 py-2">
          <p className="text-xs font-semibold text-charcoal/70">{section.title}</p>
          <ul className="mt-1 space-y-1 text-sm leading-relaxed text-charcoal/90">
            {section.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ))}
      {answer.insufficientData && answer.insufficientData.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="text-xs font-semibold">추가 데이터 필요</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {answer.insufficientData.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {answer.evidenceNote && (
        <p className="text-[11px] text-muted">근거: {answer.evidenceNote}</p>
      )}
    </div>
  )
}

export function MotionHubAiAssistantPanel({ year, month }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'MotionHub AI Assistant입니다. 센터 데이터만으로 답변합니다. 아래 예시를 누르거나 질문을 입력하세요.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contextRef = useRef<Awaited<ReturnType<typeof fetchMotionHubAssistantContext>> | null>(
    null,
  )
  const listRef = useRef<HTMLDivElement>(null)

  const loadContext = useCallback(async () => {
    contextRef.current = await fetchMotionHubAssistantContext(year, month)
  }, [year, month])

  useEffect(() => {
    void loadContext().catch(() => {
      contextRef.current = null
    })
  }, [loadContext])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function submitQuestion(question: string) {
    const trimmed = question.trim()
    if (!trimmed || loading) return

    setInput('')
    setError(null)
    setLoading(true)
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: trimmed },
    ])

    try {
      if (!contextRef.current) {
        await loadContext()
      }
      const context = contextRef.current
      if (!context) throw new Error('센터 데이터를 불러오지 못했습니다.')

      const answer = answerMotionHubQuestion(trimmed, context)
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: formatAssistantAnswer(answer),
          answer,
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : '답변 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={`${cardClass} flex min-h-[28rem] flex-col overflow-hidden`}>
      <header className="border-b border-charcoal/8 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
          MotionHub AI Assistant
        </p>
        <h2 className="mt-1 text-lg font-bold text-charcoal">센터 경영 Q&A</h2>
        <p className="mt-1 text-xs text-muted">
          MotionHub 데이터만 사용 · 근거 없는 추측 없음
        </p>
      </header>

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-charcoal text-cream'
                  : 'border border-charcoal/10 bg-cream/40 text-charcoal'
              }`}
            >
              {msg.answer ? <AnswerBlocks answer={msg.answer} /> : <p className="leading-relaxed">{msg.text}</p>}
            </div>
          </div>
        ))}
        {loading && (
          <p className="text-sm text-muted">MotionHub 데이터 분석 중…</p>
        )}
        {error && (
          <div className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-charcoal/8 px-5 py-4 space-y-3">
        <div className="chip-scroll -mx-1 px-1">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void submitQuestion(q)}
              disabled={loading}
              className="chip chip-inactive whitespace-nowrap"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void submitQuestion(input)
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="센터 경영에 대해 질문하세요"
            className={`${inputClass} min-w-0 flex-1`}
            disabled={loading}
          />
          <button type="submit" className={btnGold} disabled={loading || !input.trim()}>
            질문
          </button>
          <button
            type="button"
            className={btnOutline}
            disabled={loading}
            onClick={() => void loadContext()}
          >
            새로고침
          </button>
        </form>
      </div>
    </section>
  )
}
