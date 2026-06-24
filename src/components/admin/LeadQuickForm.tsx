import { useState } from 'react'
import type { LeadCreateInput } from '../../api/leads'
import {
  LEAD_INTEREST_LABELS,
  LEAD_SOURCE_LABELS,
  type LeadInterest,
  type LeadSource,
} from '../../types/leads'
import {
  LEAD_MARKETING_CONSENT_LABEL,
  LEAD_PRIVACY_CONSENT_LABEL,
  LEAD_PRIVACY_NOTICE,
} from '../../constants/leadPrivacy'
import { btnGold, cardClass, inputClass } from '../../styles/theme'
import type { Trainer } from '../../types/database'

type Props = {
  trainers: Trainer[]
  onCreated: () => void
  onSubmit: (input: LeadCreateInput) => Promise<void>
}

export function LeadQuickForm({ trainers, onCreated, onSubmit }: Props) {
  const [legalName, setLegalName] = useState('')
  const [displayLabel, setDisplayLabel] = useState('')
  const [phone, setPhone] = useState('')
  const [source, setSource] = useState<LeadSource>('phone')
  const [interest, setInterest] = useState<LeadInterest>('pt')
  const [message, setMessage] = useState('')
  const [trainerId, setTrainerId] = useState('')
  const [nextContactAt, setNextContactAt] = useState('')
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const trainer = trainers.find((t) => t.id === trainerId)
      await onSubmit({
        legal_name: legalName,
        display_label: displayLabel,
        phone,
        source,
        interest,
        message,
        assigned_trainer_id: trainerId || null,
        assigned_trainer_name: trainer?.name ?? null,
        next_contact_at: nextContactAt || null,
        agree_privacy: phone.trim() ? agreePrivacy : false,
        agree_marketing: agreeMarketing,
      })
      setLegalName('')
      setDisplayLabel('')
      setPhone('')
      setMessage('')
      setTrainerId('')
      setNextContactAt('')
      setAgreePrivacy(false)
      setAgreeMarketing(false)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${cardClass} card-pad space-y-4`}>
      <div>
        <p className="text-sm font-semibold text-charcoal">빠른 등록</p>
        <p className="mt-1 text-xs text-charcoal/55">
          이름·연락처 없이도 문의 내용만 저장할 수 있습니다.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-charcoal">이름 (선택)</span>
          <input
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            className={inputClass}
            placeholder="확인된 경우만"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-charcoal">연락처 (선택)</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="010-0000-0000"
            inputMode="tel"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-charcoal">
            구분 라벨 (무기명 시)
          </span>
          <input
            value={displayLabel}
            onChange={(e) => setDisplayLabel(e.target.value)}
            className={inputClass}
            placeholder="예: 6/5 오후 방문 · 필라테스 문의"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-charcoal">문의 경로</span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as LeadSource)}
            className={inputClass}
          >
            {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-charcoal">관심</span>
          <select
            value={interest}
            onChange={(e) => setInterest(e.target.value as LeadInterest)}
            className={inputClass}
          >
            {Object.entries(LEAD_INTEREST_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-charcoal">문의·상담 메모</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className={`${inputClass} resize-y`}
            placeholder="상담 내용, 통증 부위, 희망 시간 등"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-charcoal">담당 트레이너</span>
          <select
            value={trainerId}
            onChange={(e) => setTrainerId(e.target.value)}
            className={inputClass}
          >
            <option value="">미지정</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-charcoal">다음 연락일</span>
          <input
            type="date"
            value={nextContactAt}
            onChange={(e) => setNextContactAt(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      {phone.trim() ? (
        <label className="flex items-start gap-2 text-sm text-charcoal/80">
          <input
            type="checkbox"
            checked={agreePrivacy}
            onChange={(e) => setAgreePrivacy(e.target.checked)}
            className="mt-1"
          />
          <span>{LEAD_PRIVACY_CONSENT_LABEL}</span>
        </label>
      ) : null}

      <label className="flex items-start gap-2 text-sm text-charcoal/80">
        <input
          type="checkbox"
          checked={agreeMarketing}
          onChange={(e) => setAgreeMarketing(e.target.checked)}
          className="mt-1"
        />
        <span>{LEAD_MARKETING_CONSENT_LABEL}</span>
      </label>

      <p className="whitespace-pre-line rounded-xl border border-charcoal/10 bg-cream/40 px-3 py-2 text-[11px] leading-relaxed text-charcoal/60">
        {LEAD_PRIVACY_NOTICE}
      </p>

      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}

      <button type="submit" disabled={loading} className={`${btnGold} w-full sm:w-auto`}>
        {loading ? '저장 중…' : '상담 리드 등록'}
      </button>
    </form>
  )
}
