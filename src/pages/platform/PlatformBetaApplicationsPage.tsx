import { useCallback, useEffect, useState } from 'react'
import {
  BETA_CENTER_TYPE_LABELS,
  fetchBetaApplicationsForPlatform,
} from '../../api/platformBetaApplications'
import { formatPhone } from '../../api/members'
import { exportBetaApplicationsExcel } from '../../lib/platformExcelExport'
import { btnPrimary, cardClass } from '../../styles/theme'
import type { BetaApplication } from '../../types/database'

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ko-KR')
}

export default function PlatformBetaApplicationsPage() {
  const [applications, setApplications] = useState<BetaApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setApplications(await fetchBetaApplicationsForPlatform())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '베타 신청 목록을 불러오지 못했습니다.',
      )
      setApplications([])
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
          <h1 className="text-2xl font-bold text-white">베타 신청</h1>
          <p className="mt-1 text-sm text-cream/60">
            motionhub.kr 랜딩 페이지에서 접수된 베타 신청서입니다.
          </p>
        </div>
        <button
          type="button"
          disabled={loading || applications.length === 0}
          onClick={() => exportBetaApplicationsExcel(applications)}
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

      <section className={`${cardClass} overflow-hidden !border-white/10 !bg-[#161d26]`}>
        {loading ? (
          <p className="card-pad text-sm text-cream/60">불러오는 중…</p>
        ) : applications.length === 0 ? (
          <p className="card-pad text-sm text-cream/60">접수된 베타 신청이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-cream/50">
                <tr>
                  <th className="px-4 py-3 font-medium">접수일</th>
                  <th className="px-4 py-3 font-medium">센터명</th>
                  <th className="px-4 py-3 font-medium">담당자</th>
                  <th className="px-4 py-3 font-medium">연락처</th>
                  <th className="px-4 py-3 font-medium">이메일</th>
                  <th className="px-4 py-3 font-medium">유형</th>
                  <th className="px-4 py-3 font-medium">문의</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {applications.map((app) => (
                  <tr key={app.id} className="text-cream/85">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                      {formatDateTime(app.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{app.center_name}</td>
                    <td className="px-4 py-3">{app.contact_name}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <a
                        href={`tel:${app.phone}`}
                        className="text-teal-300 hover:underline"
                      >
                        {formatPhone(app.phone)}
                      </a>
                    </td>
                    <td className="px-4 py-3">{app.email ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {BETA_CENTER_TYPE_LABELS[app.center_type]}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-cream/70">
                      {app.message?.trim() ? app.message : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
