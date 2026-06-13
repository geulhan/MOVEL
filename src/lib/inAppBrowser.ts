/** 카카오톡·인스타·페이스북·라인 등 인앱 브라우저 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return (
    ua.includes('kakaotalk') ||
    ua.includes('instagram') ||
    ua.includes('fbav') ||
    ua.includes('fban') ||
    ua.includes('line/')
  )
}

/**
 * iOS 카카오톡 인앱 브라우저에서 window.confirm이 무응답·오동작하는 경우가 많음.
 * 회원 포털 등 모바일 핵심 액션은 UI 확인 모달을 사용합니다.
 */
export function prefersUiConfirm(): boolean {
  return isInAppBrowser()
}
