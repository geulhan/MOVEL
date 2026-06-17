import { useCallback, useEffect, useState } from 'react'
import { getGardenState } from '../api/garden'
import type { GardenState } from '../types/garden'

export function useGardenState(memberId: string | undefined, refreshToken = 0) {
  const [state, setState] = useState<GardenState | null>(null)
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
      const data = await getGardenState(memberId)
      setState(data)
    } catch (err) {
      setState(null)
      setError(err instanceof Error ? err.message : '정원 정보를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void reload()
  }, [reload, refreshToken])

  return { state, loading, error, reload, setState }
}
