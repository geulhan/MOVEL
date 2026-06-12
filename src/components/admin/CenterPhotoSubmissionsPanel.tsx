import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchCenterPhotoSubmissions,
  type CenterPhotoSubmissionWithMember,
} from '../../api/centerPhoto'
import { cardClass } from '../../styles/theme'

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

export function CenterPhotoSubmissionsPanel() {
  const [rows, setRows] = useState<CenterPhotoSubmissionWithMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchCenterPhotoSubmissions({ limit: 40 }))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '센터 사진 인증 내역을 불러올 수 없습니다.',
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
          <h3 className="text-sm font-bold text-charcoal">센터 사진 인증</h3>
          <p className="mt-0.5 text-xs text-muted">
            회원 업로드 사진과 MILE 적립 내역을 확인합니다.
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

      {error && <p className="px-5 py-4 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gold/15 bg-cream/50 text-left text-xs text-muted">
              <th className="px-4 py-2 font-semibold">일시</th>
              <th className="px-4 py-2 font-semibold">회원</th>
              <th className="px-4 py-2 font-semibold">적립</th>
              <th className="px-4 py-2 font-semibold">상태</th>
              <th className="px-4 py-2 font-semibold">사진</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  불러오는 중…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  인증 내역이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-gold/10">
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {formatWhen(row.created_at)}
                    <p className="text-[10px] text-muted">{row.submission_date}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      to={`/admin/member/${row.member_id}`}
                      className="font-medium text-charcoal hover:underline"
                    >
                      {row.member_name ?? '회원'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-bold tabular-nums text-gold-dark">
                    {row.mile_awarded > 0
                      ? `+${row.mile_awarded.toLocaleString()}M`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-green-700">
                    {row.status === 'approved' ? '승인' : row.status}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <a
                      href={row.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-charcoal hover:underline"
                    >
                      보기
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
