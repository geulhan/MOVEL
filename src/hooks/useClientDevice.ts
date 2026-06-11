import { useEffect, useState } from 'react'
import { isAndroid, isIOS, isMobileDevice } from '../lib/device'

export function useClientDevice() {
  const [ready, setReady] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [ios, setIos] = useState(false)
  const [android, setAndroid] = useState(false)

  useEffect(() => {
    setMobile(isMobileDevice())
    setIos(isIOS())
    setAndroid(isAndroid())
    setReady(true)
  }, [])

  return {
    ready: ready,
    isMobile: mobile,
    isIOS: ios,
    isAndroid: android,
  }
}
