import { useEffect, useState } from 'react'
import { loadMemberTheme, saveMemberTheme } from '../../lib/memberTheme'
import { btnOutline, btnPrimary, inputClass } from '../../styles/theme'
import {
  DEFAULT_CENTER_THEME,
  THEME_PRESETS,
  type CenterTheme,
  type ThemePreset,
} from '../../types/centerBranding'

type ColorFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  const pickerValue = value.startsWith('#') ? value : '#1c1c1c'

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-11 cursor-pointer rounded border border-charcoal/15 bg-white p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      </div>
    </label>
  )
}

const THEME_FIELDS: { key: keyof CenterTheme; label: string }[] = [
  { key: 'mainBg', label: '배경색' },
  { key: 'mainText', label: '글자색' },
  { key: 'accent', label: '포인트 색' },
  { key: 'sidebarBg', label: '헤더 배경' },
  { key: 'sidebarText', label: '헤더 글자' },
]

type Props = {
  memberId: string
  onThemeChange: (theme: CenterTheme) => void
}

export function MemberThemeSettings({ memberId, onThemeChange }: Props) {
  const [theme, setTheme] = useState<CenterTheme>(() => loadMemberTheme(memberId))
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setTheme(loadMemberTheme(memberId))
  }, [memberId])

  function applyPreset(preset: ThemePreset) {
    setTheme(preset.theme)
    setMessage(null)
  }

  function handleSave() {
    saveMemberTheme(memberId, theme)
    onThemeChange(theme)
    setMessage('화면 테마가 저장되었습니다.')
  }

  function handleReset() {
    setTheme(DEFAULT_CENTER_THEME)
    saveMemberTheme(memberId, DEFAULT_CENTER_THEME)
    onThemeChange(DEFAULT_CENTER_THEME)
    setMessage('기본 테마로 되돌렸습니다.')
  }

  return (
    <div className="mt-6 space-y-4 border-t border-charcoal/10 pt-6">
      <div>
        <h4 className="text-sm font-bold text-charcoal">화면 테마</h4>
        <p className="mt-1 text-xs text-muted">
          회원 페이지 색상을 내 취향에 맞게 설정합니다. 이 기기에만 저장됩니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {THEME_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(preset)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              theme.mainBg === preset.theme.mainBg &&
              theme.accent === preset.theme.accent
                ? 'border-charcoal bg-charcoal text-white'
                : 'border-charcoal/15 bg-white text-charcoal hover:bg-cream/80'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {THEME_FIELDS.map((field) => (
          <ColorField
            key={field.key}
            label={field.label}
            value={theme[field.key]}
            onChange={(value) =>
              setTheme((prev) => ({
                ...prev,
                [field.key]: value,
              }))
            }
          />
        ))}
      </div>

      <div
        className="overflow-hidden rounded-xl border border-charcoal/10"
        style={{
          background: theme.mainBg,
          color: theme.mainText,
          borderColor: `${theme.accent}44`,
        }}
      >
        <div className="px-4 py-3" style={{ background: theme.sidebarBg, color: theme.sidebarText }}>
          미리보기 헤더
        </div>
        <div className="p-4">
          <p className="text-sm font-semibold">카드 영역 예시</p>
          <p className="mt-1 text-xs opacity-70">저장 후 회원 페이지에 적용됩니다.</p>
          <span
            className="mt-3 inline-block rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
            style={{ background: theme.accent }}
          >
            버튼
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleSave} className={btnPrimary}>
          테마 저장
        </button>
        <button type="button" onClick={handleReset} className={btnOutline}>
          기본값
        </button>
      </div>

      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </div>
  )
}
