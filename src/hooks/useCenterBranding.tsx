import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchCenterBranding } from '../api/centerBranding'
import { getAdminSession } from '../lib/adminSession'
import {
  DEFAULT_CENTER_THEME,
  themeToCssVars,
  type CenterBranding,
  type CenterTheme,
} from '../types/centerBranding'

type CenterBrandingContextValue = {
  branding: CenterBranding
  loading: boolean
  refresh: () => Promise<void>
  applyLocal: (patch: Partial<CenterBranding>) => void
}

const fallbackBranding = (session: ReturnType<typeof getAdminSession>): CenterBranding => ({
  centerId: session?.centerId ?? '',
  centerName: session?.centerName ?? '센터',
  centerSlug: session?.centerSlug ?? '',
  logoUrl: null,
  theme: DEFAULT_CENTER_THEME,
})

const CenterBrandingContext = createContext<CenterBrandingContextValue | null>(null)

export function CenterBrandingProvider({ children }: { children: ReactNode }) {
  const centerId = getAdminSession()?.centerId ?? null
  const [branding, setBranding] = useState<CenterBranding>(() =>
    fallbackBranding(getAdminSession()),
  )
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const session = getAdminSession()
    if (!session?.centerId) {
      setBranding(fallbackBranding(session))
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const next = await fetchCenterBranding(session.centerId)
      setBranding(next)
    } catch {
      // 저장 직후 일시 오류 등 — 기존 브랜딩 유지
    } finally {
      setLoading(false)
    }
  }, [centerId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const applyLocal = useCallback((patch: Partial<CenterBranding>) => {
    setBranding((prev) => ({ ...prev, ...patch }))
  }, [])

  const value = useMemo(
    () => ({ branding, loading, refresh, applyLocal }),
    [branding, loading, refresh, applyLocal],
  )

  return (
    <CenterBrandingContext.Provider value={value}>
      {children}
    </CenterBrandingContext.Provider>
  )
}

export function useCenterBranding() {
  const ctx = useContext(CenterBrandingContext)
  if (!ctx) {
    throw new Error('useCenterBranding must be used within CenterBrandingProvider')
  }
  return ctx
}

export function useCenterThemeVars(theme: CenterTheme = DEFAULT_CENTER_THEME) {
  return useMemo(() => themeToCssVars(theme), [theme])
}

export function useApplyCenterTheme(theme: CenterTheme, centerName?: string) {
  useEffect(() => {
    const vars = themeToCssVars(theme)
    const root = document.documentElement
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value)
    }
    return () => {
      for (const key of Object.keys(vars)) {
        root.style.removeProperty(key)
      }
    }
  }, [theme])

  useEffect(() => {
    document.title = centerName ? `${centerName} | 모션허브` : '모션허브'
  }, [centerName])
}
