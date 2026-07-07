import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import {
  fetchCenterOnboardingProgress,
  type CenterOnboardingProgress,
} from '../api/centerOnboarding'
import {
  betaStartPercent,
  buildBetaStartSteps,
  isBetaStartComplete,
  nextBetaStartStep,
  type BetaStartStep,
} from '../lib/betaStartSteps'
import { getAdminSession } from '../lib/adminSession'
import { CENTER_FEATURES_CONFIGURED_EVENT } from '../lib/centerOnboardingStorage'

type BetaStartContextValue = {
  progress: CenterOnboardingProgress | null
  steps: BetaStartStep[]
  percent: number
  complete: boolean
  nextStep: BetaStartStep | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const BetaStartContext = createContext<BetaStartContextValue | null>(null)

export function BetaStartProvider({ children }: { children: ReactNode }) {
  const session = getAdminSession()
  const isAdmin = session?.role === 'admin'
  const location = useLocation()
  const [progress, setProgress] = useState<CenterOnboardingProgress | null>(null)
  const [loading, setLoading] = useState(isAdmin)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isAdmin) {
      setProgress(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCenterOnboardingProgress()
      setProgress(data)
    } catch (err) {
      setProgress(null)
      setError(
        err instanceof Error
          ? err.message
          : '베타 시작하기 진행 상황을 불러오지 못했습니다.',
      )
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    void refresh()
  }, [refresh, location.pathname])

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') void refresh()
    }
    function handleFeaturesConfigured() {
      void refresh()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener(CENTER_FEATURES_CONFIGURED_EVENT, handleFeaturesConfigured)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener(CENTER_FEATURES_CONFIGURED_EVENT, handleFeaturesConfigured)
    }
  }, [refresh])

  const steps = useMemo(
    () => (progress ? buildBetaStartSteps(progress) : []),
    [progress],
  )
  const percent = betaStartPercent(steps)
  const complete = isBetaStartComplete(steps)
  const nextStep = nextBetaStartStep(steps)

  const value = useMemo(
    () => ({
      progress,
      steps,
      percent,
      complete,
      nextStep,
      loading,
      error,
      refresh,
    }),
    [progress, steps, percent, complete, nextStep, loading, error, refresh],
  )

  return (
    <BetaStartContext.Provider value={value}>{children}</BetaStartContext.Provider>
  )
}

export function useBetaStart(): BetaStartContextValue {
  const context = useContext(BetaStartContext)
  if (!context) {
    throw new Error('useBetaStart must be used within BetaStartProvider')
  }
  return context
}
