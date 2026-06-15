import { useEffect, useState } from 'react'
import {
  CENTER_FEATURE_LABELS,
  CENTER_FEATURE_KEYS,
  parseCenterFeatures,
  type CenterFeatureKey,
  type CenterFeatures,
} from '../../types/centerFeatures'
import { updatePlatformCenterFeatures } from '../../api/platformCenters'
import type { PlatformCenter } from '../../api/platformCenters'
import { btnOutline, btnPrimary } from '../../styles/theme'

type Props = {
  center: PlatformCenter
  onClose: () => void
  onSaved: () => void
}

export function PlatformCenterFeaturesModal({ center, onClose, onSaved }: Props) {
  const [features, setFeatures] = useState<CenterFeatures>(() =>
    parseCenterFeatures(center.features),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFeatures(parseCenterFeatures(center.features))
  }, [center])

  function toggleFeature(key: CenterFeatureKey) {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await updatePlatformCenterFeatures(center.id, features)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '권한 저장에 실패했습니다.')
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
        <h2 className="text-lg font-bold text-white">이용 권한 설정</h2>
        <p className="mt-1 text-sm text-cream/60">
          {center.name} <span className="font-mono text-xs">({center.slug})</span>
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {CENTER_FEATURE_KEYS.map((key) => {
            const meta = CENTER_FEATURE_LABELS[key]
            return (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-white/20"
              >
                <input
                  type="checkbox"
                  checked={features[key]}
                  onChange={() => toggleFeature(key)}
                  className="mt-1 h-4 w-4 rounded border-white/30"
                />
                <span>
                  <span className="block text-sm font-semibold text-white">{meta.label}</span>
                  <span className="mt-0.5 block text-xs text-cream/55">{meta.description}</span>
                </span>
              </label>
            )
          })}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={btnOutline} onClick={onClose} disabled={saving}>
            취소
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
