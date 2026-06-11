import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchStepVerificationsWithMembers,
  type StepVerificationWithMember,
} from '../../api/stepVerification'
import { computeStepTierAwards } from '../../api/rewards'
import { cardClass } from '../../styles/theme'

function statusLabel(status: StepVerificationWithMember['status']): string {
  if (status === 'approved') return '승인'
  if (status === 'rejected') return '반려'
  return '검수 중'
}

function statusClass(status: StepVerificationWithMember['status']): string {
  if (status === 'approved') return 'text-green-700'
  if (status === 'rejected') return 'text-red-600'
  return 'text-charcoal/60'
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

export function StepVerificationsPanel() {
  const [rows, setRows] = useState<StepVerificationWithMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchStepVerificationsWithMembers({ limit: 40 }))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '걸음 인증 내역을 불러올 수 없습니다.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="flex items-center justify-between border-b border-gold/20 px-5 py-4">
        <div>
          <h3 className="text-sm font-bold text-charcoal">최근 걸음 인증</h3>
          <p className="mt-0.5 text-xs text-muted">
            OCR 인식 걸음수와 적립 구간을 확인하세요. 오류 시 수동 조정으로
            정정할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="text-xs font-semibold text-charcoal hover:underline"
        >
          새로고침
        </button>
      </div>

      {error && (
        <p className="px-5 py-4 text-sm text-red-700">{error}</p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gold/15 bg-cream/50 text-left text-xs text-muted">
              <th className="px-4 py-2 font-semibold">일시</th>
              <th className="px-4 py-2 font-semibold">회원</th>
              <th className="px-4 py-2 font-semibold">인식 걸음</th>
              <th className="px-4 py-2 font-semibold">적립 구간</th>
              <th className="px-4 py-2 font-semibold">상태</th>
              <th className="px-4 py-2 font-semibold">캡처</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  불러오는 중…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  인증 내역이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const awards =
                  row.status === 'approved' && row.extracted_step_count != null
                    ? computeStepTierAwards(row.extracted_step_count)
                    : []
                const awardSummary = awards
                  .map((award) => `+${award.mile}M`)
                  .join(' / ')

                return (
                  <tr key={row.id} className="border-b border-gold/10">
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      {formatWhen(row.created_at)}
                      <p className="text-[10px] text-muted">
                        {row.verification_date}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        to={`/admin/member/${row.member_id}`}
                        className="font-medium text-charcoal hover:underline"
                      >
                        {row.member_name ?? '회원'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold tabular-nums">
                      {row.extracted_step_count != null
                        ? `${row.extracted_step_count.toLocaleString()}보`
                        : '-'}
                      {row.ai_confidence != null && (
                        <p className="text-[10px] font-normal text-muted">
                          OCR {Math.round(row.ai_confidence * 100)}%
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {awardSummary || (
                        <span className="text-muted">
                          {row.rejection_reason ?? '-'}
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-xs font-bold ${statusClass(row.status)}`}
                    >
                      {statusLabel(row.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.image_url ? (
                        <a
                          href={row.image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-charcoal hover:underline"
                        >
                          보기
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
