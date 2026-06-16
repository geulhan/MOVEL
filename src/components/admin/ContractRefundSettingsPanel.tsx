import { useEffect, useState } from 'react'
import {
  fetchContractSettings,
  saveContractSettings,
} from '../../api/contractSettings'
import { btnPrimary, inputClass } from '../../styles/theme'
import {
  DEFAULT_CONTRACT_SETTINGS,
  type ContractSettings,
} from '../../types/contractSettings'

export function ContractRefundSettingsPanel() {
  const [settings, setSettings] = useState<ContractSettings>({
    ...DEFAULT_CONTRACT_SETTINGS,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchContractSettings()
      .then((next) => {
        if (!cancelled) setSettings(next)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : '설정을 불러올 수 없습니다.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const next = await saveContractSettings(settings)
      setSettings(next)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-gold/30 bg-white p-5">
      <div>
        <h3 className="font-semibold text-charcoal">PT 환불 기준일</h3>
        <p className="mt-1 text-sm text-muted">
          결제일 기준으로 등록 PT 횟수 × 아래 일수가 지나면 잔여 회차는 환불
          금액에서 제외됩니다. 이용 기간 연장과 무관하게 적용되며, 계약서 환불
          약관·경영분석 환불 리스크에 반영됩니다.
        </p>
      </div>

      <label className="block max-w-xs text-sm">
        <span className="font-medium text-charcoal">PT 1회당 환불 가능 일수</span>
        <input
          type="number"
          min={1}
          max={365}
          step={1}
          disabled={loading || saving}
          value={settings.ptRefundDaysPerSession}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              ptRefundDaysPerSession: Number(e.target.value),
            }))
          }
          className={`${inputClass} mt-1 w-full`}
        />
        <span className="mt-1 block text-xs text-muted">
          예: 4일 설정 시 5월 1일 5회 결제 → 5월 21일까지 환불 가능
        </span>
      </label>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && (
        <p className="text-sm font-medium text-emerald-700">저장되었습니다.</p>
      )}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={loading || saving}
        className={btnPrimary}
      >
        {saving ? '저장 중…' : '저장'}
      </button>
    </div>
  )
}
