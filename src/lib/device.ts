export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent
  const platform = navigator.platform ?? ''

  if (/iPad|iPhone|iPod/i.test(ua)) return true
  if (platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true

  // iOS Safari / 인앱 브라우저
  if (/CriOS|FxiOS|EdgiOS/i.test(ua)) return true

  return false
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

/** 터치 모바일(아이폰·안드로이드·인앱 브라우저) */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  if (isIOS() || isAndroid()) return true

  const narrowTouch =
    window.matchMedia('(max-width: 820px)').matches &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  return narrowTouch
}
