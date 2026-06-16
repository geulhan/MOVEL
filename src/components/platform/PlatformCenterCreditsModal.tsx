import { useCallback, useEffect, useState } from 'react'
import {
  fetchPlatformCenterCredits,
  grantPlatformCenterCredits,
  type PlatformCenterCreditRow,
} from '../../api/platformMessageCredits'
import { btnOutline, btnPrimary } from '../../styles/theme'

const GRANT_PRESETS = [30, 100, 500] as const

type Props = {
  open: boolean
  onClose: () => void
  /** 특정 센터만 보여줄 때 */
  focusCenterId?: string | null
}

export function PlatformCenterCreditsModal({
  open,
  onClose,
  focusCenterId = null,
}: Props) {
  const [rows, setRows] = useState<PlatformCenterCreditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [grantingId, setGrantingId] = useState<string | null>(null)
  const [customAmount, setCustomAmount] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const all = await fetchPlatformCenterCredits()
      setRows(
        focusCenterId
          ? all.filter((row) => row.centerId === focusCenterId)
          : all,
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '크레딧 목록을 불러올 수 없습니다.',
      )
    } finally {
      setLoading(false)
    }
  }, [focusCenterId])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  if (!open) return null

  async function handleGrant(centerId: string, amount: number) {
    if (!Number.isInteger(amount) || amount <= 0) {
      setError('1 이상의 정수를 입력해 주세요.')
      return
    }

    setGrantingId(centerId)
    setError(null)
    try {
      await grantPlatformCenterCredits(
        centerId,
        amount,
        `수동 지급 +${amount}건`,
      )
      setCustomAmount((prev) => ({ ...prev, [centerId]: '' }))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '지급에 실패했습니다.')
    } finally {
      setGrantingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/60 p-4 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-white/10 bg-[#161d26] shadow-xl">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-bold text-white">센터 메시지 크레딧</h2>
          <p className="mt-1 text-sm text-cream/60">
            센터별 잔여·사용량 조회 및 수동 지급 (+30 / +100 / +500 또는 직접 입력)
          </p>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {error && (
            <p className="mb-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-left text-xs text-cream/60">
                  <th className="px-4 py-3 font-semibold">센터</th>
                  <th className="px-4 py-3 font-semibold">알림톡</th>
                  <th className="px-4 py-3 font-semibold">잔여</th>
                  <th className="px-4 py-3 font-semibold">이번 달</th>
                  <th className="px-4 py-3 font-semibold">누적</th>
                  <th className="px-4 py-3 font-semibold">지급</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-cream/50">
                      불러오는 중…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-cream/50">
                      센터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.centerId} className="border-b border-white/5">
                      <td className="px-4 py-3">
                        <p className="font-medium text-cream">{row.centerName}</p>
                        <p className="font-mono text-xs text-cream/50">{row.centerSlug}</p>
                      </td>
                      <td className="px-4 py-3 text-cream/80">
                        {row.notificationsEnabled ? 'ON' : 'OFF'}
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-emerald-300">
                        {row.credits.balance.toLocaleString()}건
                      </td>
                      <td className="px-4 py-3 tabular-nums text-cream/80">
                        {row.credits.monthUsed.toLocaleString()}건
                      </td>
                      <td className="px-4 py-3 tabular-nums text-cream/80">
                        {row.credits.totalUsed.toLocaleString()}건
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {GRANT_PRESETS.map((amount) => (
                            <button
                              key={amount}
                              type="button"
                              disabled={grantingId === row.centerId}
                              onClick={() => void handleGrant(row.centerId, amount)}
                              className="rounded-md border border-white/15 px-2 py-1 text-xs font-medium text-cream hover:bg-white/10 disabled:opacity-50"
                            >
                              +{amount}
                            </button>
                          ))}
                          <input
                            type="number"
                            min={1}
                            step={1}
                            placeholder="직접"
                            value={customAmount[row.centerId] ?? ''}
                            onChange={(e) =>
                              setCustomAmount((prev) => ({
                                ...prev,
                                [row.centerId]: e.target.value,
                              }))
                            }
                            className="w-16 rounded-md border border-white/15 bg-transparent px-2 py-1 text-xs text-cream"
                          />
                          <button
                            type="button"
                            disabled={grantingId === row.centerId}
                            onClick={() =>
                              void handleGrant(
                                row.centerId,
                                Number(customAmount[row.centerId] ?? 0),
                              )
                            }
                            className={`${btnPrimary} !px-2 !py-1 text-xs`}
                          >
                            지급
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          <button type="button" onClick={onClose} className={btnOutline}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
