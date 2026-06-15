import { useCallback, useEffect, useState } from 'react'
import {
  fetchSignupConsentRecords,
  type SignupConsentRecord,
} from '../../api/platformAccounts'
import { formatPhone } from '../../api/members'
import { exportSignupConsentsExcel } from '../../lib/platformExcelExport'
import { btnOutline, btnPrimary } from '../../styles/theme'

const SUBJECT_LABELS: Record<SignupConsentRecord['subject_type'], string> = {
  member: '회원',
  center_admin: '센터 관리자',
}

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ko-KR')
}

export default function PlatformConsentsPage() {
  const [records, setRecords] = useState<SignupConsentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRecords(await fetchSignupConsentRecords())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '동의 기록을 불러오지 못했습니다.',
      )
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">가입·동의 기록</h1>
          <p className="mt-1 text-sm text-cream/60">
            회원·센터 관리자 가입 시 수집한 약관 동의 내역입니다.
          </p>
        </div>
        <button
          type="button"
          disabled={loading || records.length === 0}
          onClick={() => exportSignupConsentsExcel(records)}
          className={btnPrimary}
        >
          엑셀 다운로드
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#161d26]">
        {loading ? (
          <p className="card-pad text-sm text-cream/60">불러오는 중…</p>
        ) : records.length === 0 ? (
          <p className="card-pad text-sm text-cream/60">저장된 동의 기록이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-cream/50">
                <tr>
                  <th className="px-4 py-3 font-medium">가입일</th>
                  <th className="px-4 py-3 font-medium">유형</th>
                  <th className="px-4 py-3 font-medium">센터</th>
                  <th className="px-4 py-3 font-medium">이름</th>
                  <th className="px-4 py-3 font-medium">연락처</th>
                  <th className="px-4 py-3 font-medium">필수 동의</th>
                  <th className="px-4 py-3 font-medium">마케팅</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-white/5 text-cream/90">
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {formatDateTime(record.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {SUBJECT_LABELS[record.subject_type]}
                    </td>
                    <td className="px-4 py-3">
                      <div>{record.center_name ?? '—'}</div>
                      {record.center_slug && (
                        <div className="font-mono text-[10px] text-cream/50">
                          {record.center_slug}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{record.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {record.phone ? formatPhone(record.phone) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {record.agree_age && record.agree_terms && record.agree_privacy
                        ? '완료'
                        : '미완료'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {record.agree_marketing ? '동의' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <button type="button" onClick={() => void load()} className={btnOutline}>
        새로고침
      </button>
    </div>
  )
}
