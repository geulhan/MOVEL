import { useCallback, useEffect, useState } from 'react'
import { getSlgVillageState } from '../api/slgVillage'
import type { SlgVillageState } from '../types/slgVillage'

export function useSlgVillage(memberId: string | undefined, refreshToken = 0) {
  const [state, setState] = useState<SlgVillageState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!memberId) {
      setState(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setState(await getSlgVillageState(memberId))
    } catch (err) {
      setState(null)
      setError(err instanceof Error ? err.message : '마을 정보를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void reload()
  }, [reload, refreshToken])

  return { state, loading, error, reload, setState }
}
