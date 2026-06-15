import { useCallback, useEffect, useState } from 'react'
import { fetchCenterFeatures } from '../api/centerFeatures'
import { getAdminSession } from '../lib/adminSession'
import { DEFAULT_CENTER_FEATURES, type CenterFeatures } from '../types/centerFeatures'

export function useCenterFeatures() {
  const session = getAdminSession()
  const [features, setFeatures] = useState<CenterFeatures>(DEFAULT_CENTER_FEATURES)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session?.centerId) {
      setFeatures(DEFAULT_CENTER_FEATURES)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const next = await fetchCenterFeatures(session.centerId)
      setFeatures(next)
    } catch {
      setFeatures(DEFAULT_CENTER_FEATURES)
    } finally {
      setLoading(false)
    }
  }, [session?.centerId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { features, loading, refresh }
}
