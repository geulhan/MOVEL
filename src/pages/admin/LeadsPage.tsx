import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createLead, fetchLeads, formatLeadRetentionLabel, isLeadContactDueToday } from '../../api/leads'
import { fetchTrainers } from '../../api/trainers'
import { LeadDetailPanel } from '../../components/admin/LeadDetailPanel'
import { LeadQuickForm } from '../../components/admin/LeadQuickForm'
import { PageHeader } from '../../components/admin/PageHeader'
import { PAGE_HELP } from '../../lib/pageHelpTips'
import { formatSupabaseError } from '../../lib/errors'
import { cardClass } from '../../styles/theme'
import type { ConsultationLead, LeadStatus } from '../../types/leads'
import {
  LEAD_IDENTITY_LABELS,
  LEAD_INTEREST_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
} from '../../types/leads'
import type { Trainer } from '../../types/database'

type FilterKey = 'active' | LeadStatus | 'all'

const FILTER_OPTIONS: { value: FilterKey; label: string }[] = [
  { value: 'active', label: '진행 중' },
  { value: 'new', label: '신규' },
  { value: 'contacted', label: '연락 완료' },
  { value: 'trial_scheduled', label: '체험 예약' },
  { value: 'pending_register', label: '등록 검토' },
  { value: 'on_hold', label: '보류' },
  { value: 'lost', label: '이탈' },
  { value: 'converted', label: '등록 완료' },
  { value: 'all', label: '전체' },
]

export default function LeadsPage() {
  const [searchParams] = useSearchParams()
  const [leads, setLeads] = useState<ConsultationLead[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [filter, setFilter] = useState<FilterKey>('active')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rows, trainerRows] = await Promise.all([
        fetchLeads({ status: filter, search }),
        fetchTrainers(),
      ])
      setLeads(rows)
      setTrainers(trainerRows)
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const leadId = searchParams.get('leadId')
    if (leadId) setSelectedId(leadId)
  }, [searchParams])

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedId) ?? null,
    [leads, selectedId],
  )

  const dueTodayCount = useMemo(
    () => leads.filter((l) => isLeadContactDueToday(l)).length,
    [leads],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="상담"
        description="회원 등록 전 상담 문의를 관리합니다. 무기명 60일 · 연락처 6개월 보관."
        helpText={PAGE_HELP.leads}
      />

      {dueTodayCount > 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          오늘 연락 예정 {dueTodayCount}건
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          {error.includes('consultation_leads') || error.includes('PGRST') ? (
            <span className="mt-1 block text-xs">
              Supabase에서 migration_099_consultation_leads.sql 을 실행해 주세요.
            </span>
          ) : null}
        </p>
      ) : null}

      <LeadQuickForm
        trainers={trainers}
        onSubmit={async (input) => {
          await createLead(input)
        }}
        onCreated={() => void load()}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filter === opt.value
                  ? 'bg-charcoal text-white'
                  : 'bg-white text-charcoal/70 ring-1 ring-charcoal/12 hover:bg-cream/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름·번호·메모 검색"
          className="input-field max-w-xs"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <div className={`${cardClass} overflow-hidden`}>
          {loading ? (
            <p className="p-6 text-sm text-charcoal/55">불러오는 중…</p>
          ) : leads.length === 0 ? (
            <p className="p-6 text-sm text-charcoal/55">등록된 상담 리드가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-charcoal/8">
              {leads.map((lead) => (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(lead.id)}
                    className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-cream/40 ${
                      selectedId === lead.id ? 'bg-cream/60' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-charcoal">{lead.display_name}</span>
                      <span className="shrink-0 text-[10px] font-bold uppercase text-charcoal/45">
                        {LEAD_IDENTITY_LABELS[lead.identity_level]}
                      </span>
                    </div>
                    <p className="text-xs text-charcoal/60">
                      {LEAD_STATUS_LABELS[lead.status]} · {LEAD_SOURCE_LABELS[lead.source]} ·{' '}
                      {LEAD_INTEREST_LABELS[lead.interest]}
                    </p>
                    <p className="line-clamp-1 text-xs text-charcoal/45">
                      {lead.message || lead.display_label || '—'}
                    </p>
                    <p className="text-[10px] text-charcoal/40">
                      {formatLeadRetentionLabel(lead)}
                      {lead.next_contact_at ? ` · 다음 연락 ${lead.next_contact_at}` : ''}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          {selectedLead ? (
            <LeadDetailPanel
              lead={selectedLead}
              onClose={() => setSelectedId(null)}
              onUpdated={() => void load()}
            />
          ) : (
            <div className={`${cardClass} card-pad text-sm text-charcoal/55`}>
              목록에서 리드를 선택하면 상세·메모·전환을 할 수 있습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
