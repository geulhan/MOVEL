import { useEffect, useState } from 'react'
import { updatePlatformCenterServicePeriod } from '../../api/platformCenters'
import type { PlatformCenter } from '../../api/platformCenters'
import {
  formatServicePeriod,
  getServicePeriodStatus,
  SERVICE_PERIOD_STATUS_LABELS,
} from '../../types/centerServicePeriod'
import { btnOutline, btnPrimary } from '../../styles/theme'

type Props = {
  center: PlatformCenter
  onClose: () => void
  onSaved: () => void
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

export function PlatformCenterServicePeriodModal({ center, onClose, onSaved }: Props) {
  const [startsAt, setStartsAt] = useState(center.servicePeriod.startsAt ?? '')
  const [endsAt, setEndsAt] = useState(center.servicePeriod.endsAt ?? '')
  const [reactivate, setReactivate] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const periodStatus = getServicePeriodStatus(center.status, center.servicePeriod)

  useEffect(() => {
    const initialStarts =
      center.servicePeriod.startsAt ?? center.requestedServiceStartsAt ?? ''
    setStartsAt(initialStarts)
    setEndsAt(
      center.servicePeriod.endsAt ??
        (initialStarts && center.betaTrial ? addDays(initialStarts, 14) : ''),
    )
    setReactivate(true)
  }, [center])

  function handleStartsAtChange(value: string) {
    setStartsAt(value)
    if (center.betaTrial && value && !center.servicePeriod.endsAt) {
      setEndsAt(addDays(value, 14))
    }
  }

  async function handleSave() {
    if (!startsAt && !endsAt) {
      setError('이용 시작일 또는 종료일 중 하나 이상 입력해 주세요.')
      return
    }
    if (startsAt && endsAt && endsAt < startsAt) {
      setError('이용 종료일은 시작일보다 빠를 수 없습니다.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await updatePlatformCenterServicePeriod(center.id, {
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        reactivate,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '이용 기간 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161d26] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-white">서비스 이용 기간</h2>
        <p className="mt-1 text-sm text-cream/60">
          {center.name} <span className="font-mono text-xs">({center.slug})</span>
        </p>
        <p className="mt-2 text-xs text-cream/50">
          현재: {formatServicePeriod(center.servicePeriod)} ·{' '}
          {SERVICE_PERIOD_STATUS_LABELS[periodStatus]}
        </p>
        {center.requestedServiceStartsAt && center.status === 'inactive' && (
          <p className="mt-2 rounded-lg border border-teal-400/25 bg-teal-500/10 px-3 py-2 text-xs text-teal-100">
            센터가 희망한 이용 시작일:{' '}
            <strong>{center.requestedServiceStartsAt}</strong>
          </p>
        )}
        {center.betaTrial && (
          <p className="mt-2 text-xs text-cream/45">
            베타 센터는 이용 시작일 기준 14일 무료 이용을 권장합니다.
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-cream/80">이용 시작일</span>
            <input
              type="date"
              value={startsAt}
              onChange={(e) => handleStartsAtChange(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-cream/80">이용 종료일</span>
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <input
              type="checkbox"
              checked={reactivate}
              onChange={(e) => setReactivate(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-semibold text-white">
                기간 저장 시 센터 활성화
              </span>
              <span className="mt-0.5 block text-xs text-cream/55">
                승인 대기 센터는 이용 시작일·종료일 저장과 함께 운영 중으로 전환됩니다.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnOutline}>
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className={btnPrimary}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
