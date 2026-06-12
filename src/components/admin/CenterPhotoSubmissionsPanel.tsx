import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  approveCenterPhotoSubmission,
  countPendingCenterPhotoSubmissions,
  fetchCenterPhotoSubmissions,
  rejectCenterPhotoSubmission,
  type CenterPhotoStatus,
  type CenterPhotoSubmissionWithMember,
} from '../../api/centerPhoto'
import { btnGold, btnOutline, cardClass, inputClass } from '../../styles/theme'

type FilterTab = 'pending' | 'all'

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

function statusLabel(status: CenterPhotoStatus): string {
  if (status === 'approved') return '승인'
  if (status === 'rejected') return '반려'
  return '대기'
}

function statusClass(status: CenterPhotoStatus): string {
  if (status === 'approved') return 'text-green-700'
  if (status === 'rejected') return 'text-red-600'
  return 'text-amber-700'
}

export function CenterPhotoSubmissionsPanel() {
  const [filter, setFilter] = useState<FilterTab>('pending')
  const [rows, setRows] = useState<CenterPhotoSubmissionWithMember[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, count] = await Promise.all([
        fetchCenterPhotoSubmissions({
          status: filter === 'pending' ? 'pending' : undefined,
          limit: filter === 'pending' ? 100 : 40,
        }),
        countPendingCenterPhotoSubmissions(),
      ])
      setRows(list)
      setPendingCount(count)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '센터 인증 내역을 불러올 수 없습니다.',
      )
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  async function handleApprove(id: string) {
    setActingId(id)
    setError(null)
    try {
      await approveCenterPhotoSubmission(id)
      setRejectingId(null)
      setRejectReason('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '승인 처리에 실패했습니다.')
    } finally {
      setActingId(null)
    }
  }

  async function handleReject(id: string) {
    setActingId(id)
    setError(null)
    try {
      await rejectCenterPhotoSubmission(id, rejectReason)
      setRejectingId(null)
      setRejectReason('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '반려 처리에 실패했습니다.')
    } finally {
      setActingId(null)
    }
  }

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/20 px-5 py-4">
        <div>
          <h3 className="text-sm font-bold text-charcoal">센터 인증</h3>
          <p className="mt-0.5 text-xs text-muted">
            회원이 제출한 센터 사진을 확인한 뒤 승인하면 SCORE · MILE이 적립됩니다.
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

      <div className="flex gap-2 border-b border-gold/15 px-5 py-3">
        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`rounded-full px-3 py-1 text-xs font-bold transition ${
            filter === 'pending'
              ? 'bg-gold text-charcoal'
              : 'bg-cream text-muted hover:text-charcoal'
          }`}
        >
          검수 대기
          {pendingCount > 0 ? ` (${pendingCount})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-bold transition ${
            filter === 'all'
              ? 'bg-gold text-charcoal'
              : 'bg-cream text-muted hover:text-charcoal'
          }`}
        >
          전체 내역
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
              <th className="px-4 py-2 font-semibold">처리</th>
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
                  {filter === 'pending' ? '검수 대기 중인 제출이 없습니다.' : '인증 내역이 없습니다.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-gold/10 align-top">
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
                  <td className="px-4 py-3 whitespace-nowrap text-xs font-bold">
                    <span className={statusClass(row.status)}>
                      {statusLabel(row.status)}
                    </span>
                    {row.rejection_reason && (
                      <p className="mt-1 max-w-[10rem] font-normal text-red-600">
                        {row.rejection_reason}
                      </p>
                    )}
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
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.status === 'pending' ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={actingId === row.id}
                            onClick={() => void handleApprove(row.id)}
                            className={`${btnGold} px-3 py-1.5 text-xs`}
                          >
                            {actingId === row.id ? '처리 중…' : '승인'}
                          </button>
                          <button
                            type="button"
                            disabled={actingId === row.id}
                            onClick={() => {
                              setRejectingId(row.id)
                              setRejectReason('')
                            }}
                            className={`${btnOutline} px-3 py-1.5 text-xs`}
                          >
                            반려
                          </button>
                        </div>
                        {rejectingId === row.id && (
                          <div className="flex min-w-[12rem] flex-col gap-1">
                            <input
                              type="text"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="반려 사유"
                              className={`${inputClass} text-xs`}
                            />
                            <button
                              type="button"
                              disabled={actingId === row.id || !rejectReason.trim()}
                              onClick={() => void handleReject(row.id)}
                              className="text-xs font-bold text-red-700 hover:underline disabled:opacity-40"
                            >
                              반려 확정
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted">-</span>
                    )}
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
