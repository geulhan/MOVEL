import { useEffect, useState } from 'react'
import {
  invalidateCenterFeaturesCache,
  useCenterFeatures,
} from '../../hooks/useCenterFeatures'
import { saveCenterOperationalFeatures } from '../../api/centerFeatures'
import { getAdminSession } from '../../lib/adminSession'
import {
  CENTER_FEATURE_KEYS,
  CENTER_FEATURE_LABELS,
  OPERATIONAL_FEATURE_KEYS,
  type CenterFeatureKey,
  type CenterFeatures,
} from '../../types/centerFeatures'
import { btnOutline, btnPrimary, cardClass } from '../../styles/theme'

function FeatureToggle({
  featureKey,
  enabled,
  disabled,
  onChange,
}: {
  featureKey: CenterFeatureKey
  enabled: boolean
  disabled?: boolean
  onChange: (key: CenterFeatureKey, value: boolean) => void
}) {
  const meta = CENTER_FEATURE_LABELS[featureKey]

  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-gold/20 bg-white px-4 py-3">
      <div>
        <p className="font-medium text-charcoal">{meta.label}</p>
        <p className="mt-0.5 text-xs text-muted">{meta.description}</p>
      </div>
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 shrink-0 accent-charcoal"
        checked={enabled}
        disabled={disabled}
        onChange={(e) => onChange(featureKey, e.target.checked)}
      />
    </label>
  )
}

export function CenterFeatureManagementPanel() {
  const session = getAdminSession()
  const { features, loading, refresh } = useCenterFeatures()
  const [draft, setDraft] = useState<CenterFeatures>(features)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDraft(features)
  }, [features])

  function handleToggle(key: CenterFeatureKey, value: boolean) {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const next = await saveCenterOperationalFeatures(draft)
      if (session?.centerId) invalidateCenterFeaturesCache(session.centerId)
      setDraft(next)
      await refresh()
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const operationalKeys = OPERATIONAL_FEATURE_KEYS
  const addonKeys = CENTER_FEATURE_KEYS.filter(
    (key) => !operationalKeys.includes(key as (typeof operationalKeys)[number]),
  )

  return (
    <section className={`${cardClass} card-pad space-y-5`}>
      <div>
        <h2 className="text-lg font-semibold text-charcoal">기능 관리</h2>
        <p className="mt-1 text-sm text-muted">
          센터에 필요한 기능만 켜 두면 메뉴와 페이지가 자동으로 숨겨집니다. PT 시스템은
          그대로 유지됩니다.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted">불러오는 중…</p>
      ) : (
        <>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-charcoal">운영 기능</h3>
            <div className="grid gap-2 md:grid-cols-2">
              {operationalKeys.map((key) => (
                <FeatureToggle
                  key={key}
                  featureKey={key}
                  enabled={draft[key]}
                  onChange={handleToggle}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-charcoal">부가 기능</h3>
            <div className="grid gap-2 md:grid-cols-2">
              {addonKeys.map((key) => (
                <FeatureToggle
                  key={key}
                  featureKey={key}
                  enabled={draft[key]}
                  onChange={handleToggle}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-700">저장되었습니다.</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={btnPrimary}
          disabled={saving || loading}
          onClick={() => void handleSave()}
        >
          {saving ? '저장 중…' : '기능 설정 저장'}
        </button>
        <button
          type="button"
          className={btnOutline}
          disabled={loading}
          onClick={() => setDraft(features)}
        >
          되돌리기
        </button>
      </div>
    </section>
  )
}
