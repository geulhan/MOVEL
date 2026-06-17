import { useCallback, useEffect, useState } from 'react'
import { getGrowthProfile } from '../api/growth'
import type { GrowthProfile } from '../types/growth'

type State = {
  profile: GrowthProfile | null
  loading: boolean
  error: string | null
}

/**
 * 성장 프로필 조회 훅 (React Query 미사용 — 앱 기존 패턴과 동일)
 */
export function useGrowthProfile(memberId: string | undefined, refreshToken = 0) {
  const [state, setState] = useState<State>({
    profile: null,
    loading: true,
    error: null,
  })

  const reload = useCallback(async () => {
    if (!memberId) {
      setState({ profile: null, loading: false, error: null })
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const profile = await getGrowthProfile(memberId)
      setState({ profile, loading: false, error: null })
    } catch (err) {
      setState({
        profile: null,
        loading: false,
        error: err instanceof Error ? err.message : '성장 정보를 불러올 수 없습니다.',
      })
    }
  }, [memberId])

  useEffect(() => {
    void reload()
  }, [reload, refreshToken])

  return { ...state, reload }
}
