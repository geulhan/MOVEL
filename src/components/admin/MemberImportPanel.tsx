import { useMemo, useState } from 'react'
import { createMember } from '../../api/members'
import { formatSupabaseError } from '../../lib/errors'
import {
  CRM_PRESET_LABELS,
  exportImportTemplateExcel,
  IMPORT_FIELD_LABELS,
  mapRowsToImportDrafts,
  parseExcelFile,
  suggestColumnMapping,
  type ColumnMapping,
  type CrmPresetId,
  type ImportFieldKey,
  type ParsedSheet,
} from '../../lib/memberImport'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'
import type { Trainer } from '../../types/database'

type Props = {
  trainers: Trainer[]
  onImported: () => void
}

export function MemberImportPanel({ trainers, onImported }: Props) {
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState<CrmPresetId>('custom')
  const [sheet, setSheet] = useState<ParsedSheet | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const drafts = useMemo(() => {
    if (!sheet) return []
    return mapRowsToImportDrafts(sheet.rows, mapping)
  }, [sheet, mapping])

  const validDrafts = drafts.filter((draft) => draft.errors.length === 0)
  const invalidCount = drafts.length - validDrafts.length

  async function handleFileChange(file: File | null) {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const parsed = await parseExcelFile(file)
      if (parsed.headers.length === 0) {
        throw new Error('엑셀 시트를 읽을 수 없습니다.')
      }
      const suggested = suggestColumnMapping(parsed.headers, preset)
      setSheet(parsed)
      setMapping(suggested)
    } catch (err) {
      setSheet(null)
      setMapping({})
      setError(formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  function handlePresetChange(next: CrmPresetId) {
    setPreset(next)
    if (sheet) {
      setMapping(suggestColumnMapping(sheet.headers, next))
    }
  }

  function resolveTrainerId(name: string | null): {
    trainerId: string | null
    trainerName: string | null
  } {
    if (!name) return { trainerId: null, trainerName: null }
    const match = trainers.find(
      (trainer) => trainer.name.trim() === name.trim(),
    )
    return {
      trainerId: match?.id ?? null,
      trainerName: match?.name ?? name,
    }
  }

  async function handleImport() {
    if (validDrafts.length === 0) {
      setError('가져올 수 있는 행이 없습니다. 매핑과 데이터를 확인해 주세요.')
      return
    }

    setImporting(true)
    setError(null)
    setResult(null)

    let success = 0
    const failures: string[] = []

    for (const draft of validDrafts) {
      try {
        const { trainerId, trainerName } = resolveTrainerId(draft.trainer_name)
        await createMember({
          name: draft.name,
          phone: draft.phone,
          total_sessions: draft.total_sessions || draft.remaining_sessions || 1,
          payment_amount: draft.payment_amount,
          registered_at: draft.registered_at,
          trainer_id: trainerId,
          trainer_name: trainerName,
          status: draft.status,
        })
        success += 1
      } catch (err) {
        failures.push(
          `${draft.rowIndex}행 ${draft.name}: ${formatSupabaseError(err)}`,
        )
      }
    }

    if (success > 0) {
      onImported()
    }

    setResult(
      `${success}명 등록 완료${failures.length > 0 ? ` · 실패 ${failures.length}건` : ''}`,
    )
    if (failures.length > 0) {
      setError(failures.slice(0, 5).join('\n'))
    }
    setImporting(false)
  }

  if (!open) {
    return (
      <button type="button" className={btnOutline} onClick={() => setOpen(true)}>
        엑셀 가져오기
      </button>
    )
  }

  return (
    <section className={`${cardClass} space-y-4 p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-charcoal">CRM 엑셀 가져오기</h3>
          <p className="mt-1 text-xs text-muted">
            브로제이·바디코디 등에서 받은 엑셀을 업로드한 뒤 열을 매핑해 MotionHub
            회원 양식으로 등록합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnOutline}
            onClick={() => exportImportTemplateExcel()}
          >
            양식 다운로드
          </button>
          <button
            type="button"
            className={btnOutline}
            onClick={() => {
              setOpen(false)
              setSheet(null)
              setMapping({})
              setError(null)
              setResult(null)
            }}
          >
            닫기
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,220px)_1fr]">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">CRM 종류</span>
          <select
            className={inputClass}
            value={preset}
            onChange={(e) => handlePresetChange(e.target.value as CrmPresetId)}
          >
            {(Object.keys(CRM_PRESET_LABELS) as CrmPresetId[]).map((id) => (
              <option key={id} value={id}>
                {CRM_PRESET_LABELS[id]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">엑셀 파일</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className={inputClass}
            disabled={loading}
            onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {sheet && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(IMPORT_FIELD_LABELS) as ImportFieldKey[]).map((field) => (
            <label key={field} className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-charcoal">
                {IMPORT_FIELD_LABELS[field]}
              </span>
              <select
                className={inputClass}
                value={mapping[field] ?? ''}
                onChange={(e) =>
                  setMapping((prev) => ({
                    ...prev,
                    [field]: e.target.value || undefined,
                  }))
                }
              >
                <option value="">매핑 안 함</option>
                {sheet.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}

      {drafts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-charcoal">
            미리보기 {drafts.length}행 · 등록 가능 {validDrafts.length}명
            {invalidCount > 0 ? ` · 오류 ${invalidCount}행` : ''}
          </p>
          <div className="table-scroll max-h-72 rounded-xl border border-gold/20">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="table-head sticky top-0">
                <tr>
                  <th className="px-3 py-2">행</th>
                  <th className="px-3 py-2">이름</th>
                  <th className="px-3 py-2">연락처</th>
                  <th className="px-3 py-2">총/잔여</th>
                  <th className="px-3 py-2">등록일</th>
                  <th className="px-3 py-2">트레이너</th>
                  <th className="px-3 py-2">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/15">
                {drafts.slice(0, 50).map((draft) => (
                  <tr
                    key={draft.rowIndex}
                    className={draft.errors.length > 0 ? 'bg-red-50/80' : ''}
                  >
                    <td className="px-3 py-2 tabular-nums">{draft.rowIndex}</td>
                    <td className="px-3 py-2">{draft.name || '—'}</td>
                    <td className="px-3 py-2">{draft.phone || '—'}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {draft.total_sessions}/{draft.remaining_sessions}
                    </td>
                    <td className="px-3 py-2">{draft.registered_at}</td>
                    <td className="px-3 py-2">{draft.trainer_name ?? '—'}</td>
                    <td className="px-3 py-2">
                      {draft.errors.length > 0
                        ? draft.errors.join(', ')
                        : draft.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {drafts.length > 50 && (
            <p className="text-xs text-muted">상위 50행만 표시합니다.</p>
          )}
        </div>
      )}

      {error && (
        <p className="whitespace-pre-wrap text-sm text-red-700">{error}</p>
      )}
      {result && <p className="text-sm font-medium text-charcoal">{result}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btnPrimary}
          disabled={importing || validDrafts.length === 0}
          onClick={() => void handleImport()}
        >
          {importing ? '등록 중…' : `${validDrafts.length}명 등록`}
        </button>
      </div>
    </section>
  )
}
