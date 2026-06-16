import { useCallback, useEffect, useState } from 'react'
import { fetchCenterFeatures } from '../api/centerFeatures'
import { getAdminSession } from '../lib/adminSession'
import { DEFAULT_CENTER_FEATURES, type CenterFeatures } from '../types/centerFeatures'

const featuresCache = new Map<string, CenterFeatures>()

export function useCenterFeatures() {
  const session = getAdminSession()
  const [features, setFeatures] = useState<CenterFeatures>(() => {
    if (session?.centerId && featuresCache.has(session.centerId)) {
      return featuresCache.get(session.centerId)!
    }
    return DEFAULT_CENTER_FEATURES
  })
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
      featuresCache.set(session.centerId, next)
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

export function invalidateCenterFeaturesCache(centerId?: string) {
  if (centerId) {
    featuresCache.delete(centerId)
    return
  }
  featuresCache.clear()
}
