import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { saveCenterBranding, uploadCenterLogo } from '../../api/centerBranding'
import { getAdminSession } from '../../lib/adminSession'
import { markCenterSettingsVisited } from '../../lib/centerOnboardingStorage'
import { useCenterBranding } from '../../hooks/useCenterBranding'
import { CenterBrandMark } from '../../components/brand/CenterBrandMark'
import { PageHeader } from '../../components/admin/PageHeader'
import { SiteUrlCopy } from '../../components/SiteUrlCopy'
import { CenterFeatureManagementPanel } from '../../components/admin/CenterFeatureManagementPanel'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'
import { getMemberPortalUrl } from '../../lib/siteUrl'
import { THEME_PRESETS, type CenterTheme, type ThemePreset } from '../../types/centerBranding'

type ThemeField = {
  key: keyof CenterTheme
  label: string
}

const THEME_FIELDS: ThemeField[] = [
  { key: 'sidebarBg', label: '사이드바 배경' },
  { key: 'sidebarText', label: '사이드바 글자' },
  { key: 'accent', label: '포인트 색' },
  { key: 'mainBg', label: '본문 배경' },
  { key: 'mainText', label: '본문 글자' },
  { key: 'tabActiveText', label: '탭 활성 색' },
]

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const pickerValue = value.startsWith('#') ? value : '#1c1c1c'

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-charcoal">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded border border-gold/30 bg-white p-1"
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

function ThemePreview({
  centerName,
  logoUrl,
  theme,
}: {
  centerName: string
  logoUrl: string | null
  theme: CenterTheme
}) {
  const style = {
    ['--center-sidebar-bg' as string]: theme.sidebarBg,
    ['--center-sidebar-text' as string]: theme.sidebarText,
    ['--center-sidebar-muted' as string]: theme.sidebarMuted,
    ['--center-accent' as string]: theme.accent,
    ['--center-tab-active-bg' as string]: theme.tabActiveBg,
    ['--center-tab-active-text' as string]: theme.tabActiveText,
    ['--center-main-bg' as string]: theme.mainBg,
    ['--center-main-text' as string]: theme.mainText,
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gold/25">
      <div className="grid md:grid-cols-[9rem_1fr]">
        <div className="p-4" style={{ background: theme.sidebarBg, ...style }}>
          <CenterBrandMark
            branding={{
              centerId: 'preview',
              centerName,
              centerSlug: 'preview',
              logoUrl,
              theme,
            }}
            linkTo={undefined}
          />
          <div className="mt-4 space-y-1">
            <div
              className="rounded-lg px-2 py-1.5 text-xs font-semibold"
              style={{ background: theme.tabActiveBg, color: theme.tabActiveText }}
            >
              대시보드
            </div>
            <div className="rounded-lg px-2 py-1.5 text-xs" style={{ color: theme.sidebarMuted }}>
              회원 관리
            </div>
          </div>
        </div>
        <div className="p-4" style={{ background: theme.mainBg, color: theme.mainText }}>
          <p className="text-sm font-semibold">미리보기</p>
          <p className="mt-1 text-xs opacity-70">저장 전 테마를 확인하세요.</p>
          <div
            className="mt-3 rounded-xl border px-3 py-2 text-xs"
            style={{ borderColor: `${theme.accent}55` }}
          >
            카드 / 버튼 영역 예시
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CenterSettingsPage() {
  const { branding, applyLocal } = useCenterBranding()
  const [theme, setTheme] = useState<CenterTheme>(branding.theme)
  const [logoPreview, setLogoPreview] = useState<string | null>(branding.logoUrl)
  const [clearLogo, setClearLogo] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pendingLogoFile = useRef<File | null>(null)
  const logoPreviewBlob = useRef<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const session = getAdminSession()
    if (session?.centerId) markCenterSettingsVisited(session.centerId)
  }, [])

  useEffect(() => {
    setTheme(branding.theme)
    setLogoPreview(branding.logoUrl)
    setClearLogo(false)
    pendingLogoFile.current = null
    if (logoPreviewBlob.current) {
      URL.revokeObjectURL(logoPreviewBlob.current)
      logoPreviewBlob.current = null
    }
  }, [branding])

  function setPreviewFromFile(file: File) {
    if (logoPreviewBlob.current) {
      URL.revokeObjectURL(logoPreviewBlob.current)
    }
    const blobUrl = URL.createObjectURL(file)
    logoPreviewBlob.current = blobUrl
    setLogoPreview(blobUrl)
  }

  function applyPreset(preset: ThemePreset) {
    setSelectedPreset(preset.id)
    setTheme(preset.theme)
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    pendingLogoFile.current = file
    setClearLogo(false)
    setPreviewFromFile(file)
  }

  function handleRemoveLogo() {
    pendingLogoFile.current = null
    if (logoPreviewBlob.current) {
      URL.revokeObjectURL(logoPreviewBlob.current)
      logoPreviewBlob.current = null
    }
    setLogoPreview(null)
    setClearLogo(true)
    if (logoInputRef.current) {
      logoInputRef.current.value = ''
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const session = getAdminSession()
      if (!session?.centerId) throw new Error('센터 정보를 찾을 수 없습니다.')

      let logoUrl = branding.logoUrl
      if (pendingLogoFile.current) {
        logoUrl = await uploadCenterLogo(session.centerId, pendingLogoFile.current)
      }

      const saved = await saveCenterBranding({
        theme,
        logoUrl: clearLogo ? null : logoUrl,
        clearLogo,
      })

      applyLocal(saved)
      pendingLogoFile.current = null
      if (logoPreviewBlob.current) {
        URL.revokeObjectURL(logoPreviewBlob.current)
        logoPreviewBlob.current = null
      }
      setLogoPreview(saved.logoUrl)
      setClearLogo(false)
      if (logoInputRef.current) {
        logoInputRef.current.value = ''
      }
      setMessage('센터 설정이 저장되었습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const previewBranding = useMemo(
    () => ({
      ...branding,
      logoUrl: clearLogo ? null : logoPreview,
      theme,
    }),
    [branding, clearLogo, logoPreview, theme],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="센터 설정"
        description="센터 로고와 관리자 화면 테마를 설정합니다. 회원·트레이너 화면에도 센터명이 반영됩니다."
      />

      {message && (
        <div className="rounded-lg border border-emerald-300/60 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className={`${cardClass} card-pad space-y-4`}>
        <div>
          <h2 className="text-lg font-semibold text-charcoal">센터 정보</h2>
          <p className="mt-1 text-sm text-muted">
            센터명: <strong>{branding.centerName}</strong> · 주소:{' '}
            <code>{branding.centerSlug}</code>
          </p>
        </div>
        <SiteUrlCopy
          url={getMemberPortalUrl(branding.centerSlug)}
          label="회원 페이지 공유 링크 (카톡·QR용 — motionhub.kr)"
        />
      </section>

      <section className={`${cardClass} card-pad space-y-4`}>
        <div>
          <h2 className="text-lg font-semibold text-charcoal">로고</h2>
          <p className="mt-1 text-sm text-muted">
            권장 크기 가로 280×80px, PNG/JPG/WebP/SVG, 2MB 이하. 로고가 없으면 센터명이 표시됩니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-20 min-w-[12rem] items-center justify-center rounded-xl border border-dashed border-gold/35 bg-cream/40 px-4">
            {logoPreview && !clearLogo ? (
              <img
                key={logoPreview}
                src={logoPreview}
                alt="로고 미리보기"
                className="max-h-16 max-w-[16rem] object-contain"
              />
            ) : (
              <span className="text-sm text-muted">로고 없음</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className={`cursor-pointer ${btnOutline}`}>
              로고 업로드
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoChange}
              />
            </label>
            {(logoPreview || branding.logoUrl) && !clearLogo && (
              <button type="button" className={btnOutline} onClick={handleRemoveLogo}>
                로고 제거
              </button>
            )}
          </div>
        </div>
      </section>

      <section className={`${cardClass} card-pad space-y-5`}>
        <div>
          <h2 className="text-lg font-semibold text-charcoal">테마 프리셋</h2>
          <p className="mt-1 text-sm text-muted">
            블로그 테마처럼 프리셋을 고른 뒤 색상을 세부 조정할 수 있습니다.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`rounded-xl border p-4 text-left transition ${
                selectedPreset === preset.id
                  ? 'border-charcoal bg-cream'
                  : 'border-gold/25 bg-white hover:border-gold/50'
              }`}
            >
              <div className="mb-3 flex gap-1">
                {[preset.theme.sidebarBg, preset.theme.accent, preset.theme.mainBg].map(
                  (color) => (
                    <span
                      key={color}
                      className="h-6 w-6 rounded-full border border-black/10"
                      style={{ background: color }}
                    />
                  ),
                )}
              </div>
              <p className="font-semibold text-charcoal">{preset.name}</p>
              <p className="mt-1 text-xs text-muted">{preset.description}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {THEME_FIELDS.map((field) => (
            <ColorField
              key={field.key}
              label={field.label}
              value={theme[field.key]}
              onChange={(value) => setTheme((prev) => ({ ...prev, [field.key]: value }))}
            />
          ))}
        </div>

        <ThemePreview
          centerName={branding.centerName}
          logoUrl={previewBranding.logoUrl}
          theme={theme}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={btnPrimary}
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? '저장 중…' : '설정 저장'}
          </button>
          <button
            type="button"
            className={btnOutline}
            disabled={saving}
            onClick={() => {
              setTheme(branding.theme)
              if (logoPreviewBlob.current) {
                URL.revokeObjectURL(logoPreviewBlob.current)
                logoPreviewBlob.current = null
              }
              setLogoPreview(branding.logoUrl)
              setClearLogo(false)
              pendingLogoFile.current = null
              if (logoInputRef.current) {
                logoInputRef.current.value = ''
              }
              setSelectedPreset(null)
            }}
          >
            되돌리기
          </button>
        </div>
      </section>

      <CenterFeatureManagementPanel />
    </div>
  )
}
