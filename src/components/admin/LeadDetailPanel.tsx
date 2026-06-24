import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  addLeadNote,
  convertLeadToMember,
  fetchLeadActivities,
  formatLeadRetentionLabel,
  updateLead,
} from '../../api/leads'
import {
  LEAD_IDENTITY_LABELS,
  LEAD_INTEREST_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  type ConsultationLead,
  type LeadActivity,
  type LeadStatus,
} from '../../types/leads'
import { btnGold, btnOutline, cardClass, inputClass } from '../../styles/theme'

type Props = {
  lead: ConsultationLead
  onUpdated: () => void
  onClose: () => void
}

const ACTIVITY_LABELS: Record<LeadActivity['activity_type'], string> = {
  note: '메모',
  call: '통화',
  status_change: '상태 변경',
  name_confirmed: '이름 확인',
  phone_added: '연락처 추가',
  converted: '회원 전환',
  privacy_agreed: '개인정보 동의',
  marketing_agreed: '마케팅 동의',
}

export function LeadDetailPanel({ lead, onUpdated, onClose }: Props) {
  const navigate = useNavigate()
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [status, setStatus] = useState<LeadStatus>(lead.status)
  const [note, setNote] = useState('')
  const [legalName, setLegalName] = useState(lead.legal_name ?? '')
  const [phone, setPhone] = useState(lead.phone ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setStatus(lead.status)
    setLegalName(lead.legal_name ?? '')
    setPhone(lead.phone ?? '')
    void fetchLeadActivities(lead.id).then(setActivities).catch(() => setActivities([]))
  }, [lead])

  async function handleStatusSave() {
    setLoading(true)
    setError(null)
    try {
      await updateLead(lead.id, { status })
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setLoading(false)
    }
  }

  async function handleProfileSave() {
    setLoading(true)
    setError(null)
    try {
      await updateLead(lead.id, {
        legal_name: legalName,
        phone,
        agree_privacy: phone.trim() ? true : lead.agree_privacy,
      })
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddNote() {
    if (!note.trim()) return
    setLoading(true)
    setError(null)
    try {
      await addLeadNote(lead.id, note)
      setNote('')
      const rows = await fetchLeadActivities(lead.id)
      setActivities(rows)
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : '메모 저장 실패')
    } finally {
      setLoading(false)
    }
  }

  async function handleConvert() {
    if (!window.confirm('이 리드를 회원으로 전환할까요? (가입 안내 알림톡이 발송될 수 있습니다)')) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { member } = await convertLeadToMember(lead.id)
      onUpdated()
      onClose()
      navigate(`/admin/member/${member.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '전환 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${cardClass} card-pad space-y-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-charcoal">{lead.display_name}</p>
          <p className="mt-1 text-xs text-charcoal/55">
            {LEAD_IDENTITY_LABELS[lead.identity_level]} ·{' '}
            {formatLeadRetentionLabel(lead)}
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-charcoal/50 hover:text-charcoal">
          닫기
        </button>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-charcoal/50">상태</dt>
          <dd className="font-medium">{LEAD_STATUS_LABELS[lead.status]}</dd>
        </div>
        <div>
          <dt className="text-xs text-charcoal/50">경로 / 관심</dt>
          <dd className="font-medium">
            {LEAD_SOURCE_LABELS[lead.source]} · {LEAD_INTEREST_LABELS[lead.interest]}
          </dd>
        </div>
        {lead.next_contact_at ? (
          <div>
            <dt className="text-xs text-charcoal/50">다음 연락</dt>
            <dd className="font-medium">{lead.next_contact_at}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs text-charcoal/50">마케팅 동의</dt>
          <dd className="font-medium">{lead.agree_marketing ? '동의' : '미동의'}</dd>
        </div>
      </dl>

      {lead.message ? (
        <p className="rounded-lg bg-cream/50 px-3 py-2 text-sm text-charcoal/85 whitespace-pre-wrap">
          {lead.message}
        </p>
      ) : null}

      {lead.converted_member_id ? (
        <Link
          to={`/admin/member/${lead.converted_member_id}`}
          className="inline-block text-sm font-semibold text-motionhub-dark hover:underline"
        >
          전환된 회원 보기 →
        </Link>
      ) : (
        <div className="space-y-3 border-t border-charcoal/8 pt-4">
          <p className="text-sm font-semibold text-charcoal">정보 보강</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              className={inputClass}
              placeholder="이름"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              placeholder="연락처"
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleProfileSave}
            className={btnOutline}
          >
            연락처·이름 저장
          </button>
        </div>
      )}

      <div className="space-y-2 border-t border-charcoal/8 pt-4">
        <p className="text-sm font-semibold text-charcoal">상태 변경</p>
        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
            className={`${inputClass} max-w-xs`}
          >
            {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button type="button" disabled={loading} onClick={handleStatusSave} className={btnOutline}>
            상태 저장
          </button>
        </div>
      </div>

      <div className="space-y-2 border-t border-charcoal/8 pt-4">
        <p className="text-sm font-semibold text-charcoal">활동 기록</p>
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
            placeholder="통화·메모 추가"
          />
          <button type="button" disabled={loading} onClick={handleAddNote} className={btnOutline}>
            추가
          </button>
        </div>
        <ul className="max-h-48 space-y-2 overflow-y-auto">
          {activities.map((row) => (
            <li key={row.id} className="rounded-lg border border-charcoal/8 px-3 py-2 text-sm">
              <p className="text-[10px] font-bold uppercase text-charcoal/45">
                {ACTIVITY_LABELS[row.activity_type]} ·{' '}
                {new Date(row.created_at).toLocaleString('ko-KR')}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-charcoal/85">{row.content}</p>
            </li>
          ))}
        </ul>
      </div>

      {lead.phone && lead.status !== 'converted' ? (
        <button type="button" disabled={loading} onClick={handleConvert} className={btnGold}>
          회원으로 전환
        </button>
      ) : null}

      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </div>
  )
}
