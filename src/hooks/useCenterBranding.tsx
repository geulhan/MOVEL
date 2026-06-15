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
  const session = getAdminSession()
  const [branding, setBranding] = useState<CenterBranding>(() => fallbackBranding(session))
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
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
      setBranding(fallbackBranding(session))
    } finally {
      setLoading(false)
    }
  }, [session])

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
