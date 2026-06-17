import HomePage from './HomePage'
import MotionHubLandingPage from './MotionHubLandingPage'

/** motionhub.kr 등 플랫폼 도메인에서는 랜딩, 그 외에는 센터 앱 허브 */
export function isPlatformLandingHost(): boolean {
  if (import.meta.env.VITE_PLATFORM_LANDING === 'true') return true
  if (typeof window === 'undefined') return false
  const host = window.location.hostname.toLowerCase()
  return host.includes('motionhub')
}

export function RootPage() {
  return isPlatformLandingHost() ? <MotionHubLandingPage /> : <HomePage />
}
