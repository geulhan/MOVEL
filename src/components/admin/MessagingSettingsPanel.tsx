import { useEffect, useState } from 'react'
import {
  fetchCenterMessagingSettings,
  saveCenterMessagingSettings,
} from '../../api/messagingSettings'
import { btnPrimary, inputClass } from '../../styles/theme'
import {
  DEFAULT_CENTER_MESSAGING_SETTINGS,
  MESSAGING_TEMPLATE_FIELDS,
  type CenterMessagingSettings,
} from '../../types/messagingSettings'

export function MessagingSettingsPanel() {
  const [settings, setSettings] = useState<CenterMessagingSettings>({
    ...DEFAULT_CENTER_MESSAGING_SETTINGS,
  })
  const [hasCustomApiKeys, setHasCustomApiKeys] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [clearApiKeys, setClearApiKeys] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchCenterMessagingSettings()
      .then((result) => {
        if (!cancelled) {
          setSettings(result.settings)
          setHasCustomApiKeys(result.hasCustomApiKeys)
        }
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
      const result = await saveCenterMessagingSettings({
        settings,
        apiKey: apiKey || undefined,
        apiSecret: apiSecret || undefined,
        clearApiKeys,
      })
      setSettings(result.settings)
      setHasCustomApiKeys(result.hasCustomApiKeys)
      setApiKey('')
      setApiSecret('')
      setClearApiKeys(false)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-gold/30 bg-white p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold text-charcoal">알림톡·문자 채널 설정</h2>
        <p className="mt-1 text-sm text-muted">
          센터별 카카오 채널(pfId)과 알림톡 템플릿 ID를 등록합니다. 솔라피에서
          템플릿 심사·변수명(#{`{centerName}`} 등)을 맞춘 뒤 입력하세요.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.enabled}
          disabled={loading || saving}
          onChange={(e) =>
            setSettings((prev) => ({ ...prev, enabled: e.target.checked }))
          }
        />
        <span className="font-medium text-charcoal">이 센터 메시지 발송 사용</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-charcoal">
            카카오 채널 pfId
          </span>
          <input
            type="text"
            value={settings.pfId}
            disabled={loading || saving}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, pfId: e.target.value }))
            }
            className={inputClass}
            placeholder="KA01PF..."
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-charcoal">
            문자 대체발송 발신번호
          </span>
          <input
            type="tel"
            inputMode="numeric"
            value={settings.fromNumber}
            disabled={loading || saving}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                fromNumber: e.target.value.replace(/\D/g, ''),
              }))
            }
            className={inputClass}
            placeholder="0212345678"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-charcoal">
          발신 센터명 (선택)
        </span>
        <input
          type="text"
          value={settings.senderName}
          disabled={loading || saving}
          onChange={(e) =>
            setSettings((prev) => ({ ...prev, senderName: e.target.value }))
          }
          className={inputClass}
          placeholder="비우면 센터 등록명 사용"
        />
        <span className="mt-1 block text-xs text-muted">
          알림톡 변수 #{`{centerName}`}에 들어갑니다.
        </span>
      </label>

      <div className="space-y-3 rounded-xl border border-gold/20 bg-cream/30 p-4">
        <p className="text-sm font-semibold text-charcoal">알림톡 템플릿 ID</p>
        {MESSAGING_TEMPLATE_FIELDS.map((field) => (
          <label key={field.key} className="block text-sm">
            <span className="mb-1 block font-medium text-charcoal">
              {field.label}
            </span>
            <input
              type="text"
              value={settings.templateIds[field.key]}
              disabled={loading || saving}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  templateIds: {
                    ...prev.templateIds,
                    [field.key]: e.target.value,
                  },
                }))
              }
              className={inputClass}
            />
            <span className="mt-1 block text-xs text-muted">{field.hint}</span>
          </label>
        ))}
      </div>

      <div className="space-y-3 rounded-xl border border-gold/20 p-4">
        <p className="text-sm font-semibold text-charcoal">솔라피 API 키</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.usePlatformApiKeys}
            disabled={loading || saving}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                usePlatformApiKeys: e.target.checked,
              }))
            }
          />
          <span>MotionHub 공용 API 키 사용 (권장)</span>
        </label>
        {!settings.usePlatformApiKeys && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-charcoal">API Key</span>
              <input
                type="password"
                value={apiKey}
                disabled={loading || saving}
                onChange={(e) => setApiKey(e.target.value)}
                className={inputClass}
                placeholder={hasCustomApiKeys ? '변경 시에만 입력' : '필수'}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-charcoal">
                API Secret
              </span>
              <input
                type="password"
                value={apiSecret}
                disabled={loading || saving}
                onChange={(e) => setApiSecret(e.target.value)}
                className={inputClass}
                placeholder={hasCustomApiKeys ? '변경 시에만 입력' : '필수'}
              />
            </label>
          </div>
        )}
        {hasCustomApiKeys && (
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={clearApiKeys}
              disabled={loading || saving}
              onChange={(e) => setClearApiKeys(e.target.checked)}
            />
            <span>저장된 전용 API 키 삭제</span>
          </label>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
          <span className="mt-1 block text-xs">
            Supabase에서 migration_064_center_messaging_config.sql을 실행했는지
            확인하세요.
          </span>
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
        {saving ? '저장 중…' : '채널 설정 저장'}
      </button>
    </section>
  )
}
