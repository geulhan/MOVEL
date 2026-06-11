/** 인증코드 PiP / 플로팅 창 지원 여부 */
export type VerificationCodePipMode = 'document' | 'video' | 'overlay' | 'none'

const OVERLAY_CLOSE_EVENT = 'mobel-verification-overlay-close'

let pipVideo: HTMLVideoElement | null = null
let pipCanvas: HTMLCanvasElement | null = null
let pipDrawTimer: ReturnType<typeof setInterval> | null = null
let overlayEl: HTMLDivElement | null = null

function isTouchDevice(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  )
}

function drawCodeOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  code: string,
  dateLabel: string,
): void {
  ctx.fillStyle = '#1c1c1c'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#c8b882'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.round(height * 0.11)}px Pretendard, sans-serif`
  ctx.fillText('MOVEL', width / 2, height * 0.28)

  ctx.font = `bold ${Math.round(height * 0.22)}px Pretendard, sans-serif`
  ctx.fillText(code, width / 2, height * 0.52)

  ctx.fillStyle = 'rgba(245, 240, 232, 0.75)'
  ctx.font = `${Math.round(height * 0.08)}px Pretendard, sans-serif`
  ctx.fillText(dateLabel, width / 2, height * 0.74)
}

function cleanupVideoPiP(): void {
  if (pipDrawTimer != null) {
    clearInterval(pipDrawTimer)
    pipDrawTimer = null
  }
  if (pipVideo) {
    pipVideo.removeAttribute('src')
    pipVideo.srcObject = null
    pipVideo.remove()
    pipVideo = null
  }
  pipCanvas = null
}

function cleanupOverlayPiP(): void {
  if (!overlayEl) return
  overlayEl.remove()
  overlayEl = null
  document.dispatchEvent(new CustomEvent(OVERLAY_CLOSE_EVENT))
}

function attachOverlayDrag(el: HTMLElement, handle: HTMLElement): void {
  let startX = 0
  let startY = 0
  let originLeft = 0
  let originTop = 0
  let dragging = false

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    dragging = true
    handle.setPointerCapture(e.pointerId)
    const rect = el.getBoundingClientRect()
    originLeft = rect.left
    originTop = rect.top
    startX = e.clientX
    startY = e.clientY
    e.preventDefault()
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    const nextLeft = Math.min(
      window.innerWidth - el.offsetWidth - 8,
      Math.max(8, originLeft + dx),
    )
    const nextTop = Math.min(
      window.innerHeight - el.offsetHeight - 8,
      Math.max(8, originTop + dy),
    )
    el.style.left = `${nextLeft}px`
    el.style.top = `${nextTop}px`
    el.style.right = 'auto'
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragging) return
    dragging = false
    handle.releasePointerCapture(e.pointerId)
  }

  handle.addEventListener('pointerdown', onPointerDown)
  handle.addEventListener('pointermove', onPointerMove)
  handle.addEventListener('pointerup', onPointerUp)
  handle.addEventListener('pointercancel', onPointerUp)
}

function openOverlayPiP(code: string, dateLabel: string): boolean {
  cleanupOverlayPiP()

  overlayEl = document.createElement('div')
  overlayEl.id = 'mobel-verification-code-overlay'
  overlayEl.setAttribute('role', 'dialog')
  overlayEl.setAttribute('aria-label', '인증코드 플로팅 창')
  overlayEl.style.cssText = [
    'position:fixed',
    'top:72px',
    'right:12px',
    'z-index:99999',
    'width:min(168px, calc(100vw - 24px))',
    'border-radius:14px',
    'background:#1c1c1c',
    'border:2px solid #c8b882',
    'box-shadow:0 10px 36px rgba(0,0,0,0.38)',
    'overflow:hidden',
    'font-family:Pretendard,"Apple SD Gothic Neo",sans-serif',
    'touch-action:none',
    'user-select:none',
  ].join(';')

  overlayEl.innerHTML = `
    <div data-drag-handle style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:rgba(200,184,130,0.12);cursor:grab;">
      <span style="font-size:9px;font-weight:700;letter-spacing:0.2em;color:#c8b882;">MOVEL</span>
      <button type="button" data-close style="border:0;background:transparent;color:rgba(245,240,232,0.75);font-size:18px;line-height:1;padding:0 2px;cursor:pointer;">×</button>
    </div>
    <div style="padding:12px 10px 14px;text-align:center;color:#f5f0e8;">
      <div style="font-size:24px;font-weight:700;letter-spacing:0.1em;color:#c8b882;">${code}</div>
      <div style="margin-top:8px;font-size:11px;color:rgba(245,240,232,0.7);">${dateLabel}</div>
      <div style="margin-top:10px;font-size:10px;line-height:1.45;color:rgba(245,240,232,0.45);">건강앱으로 이동한 뒤<br/>함께 캡처하세요</div>
    </div>
  `

  const handle = overlayEl.querySelector<HTMLElement>('[data-drag-handle]')
  const closeBtn = overlayEl.querySelector<HTMLButtonElement>('[data-close]')
  if (!handle || !closeBtn) {
    cleanupOverlayPiP()
    return false
  }

  closeBtn.addEventListener('click', () => {
    cleanupOverlayPiP()
  })

  attachOverlayDrag(overlayEl, handle)
  document.body.appendChild(overlayEl)
  return true
}

export function getVerificationCodePipMode(): VerificationCodePipMode {
  if (typeof window === 'undefined') return 'none'
  if ('documentPictureInPicture' in window) return 'document'
  // 모바일·태블릿: 네이티브 PiP보다 화면 위 플로팅 창이 안정적
  if (isTouchDevice()) return 'overlay'
  if (
    typeof HTMLVideoElement !== 'undefined' &&
    document.pictureInPictureEnabled &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function'
  ) {
    return 'video'
  }
  return 'none'
}

export function isVerificationCodePipActive(): boolean {
  if (window.documentPictureInPicture?.window) return true
  if (document.pictureInPictureElement != null) return true
  return overlayEl != null
}

export function subscribeVerificationCodeOverlayClose(
  listener: () => void,
): () => void {
  document.addEventListener(OVERLAY_CLOSE_EVENT, listener)
  return () => document.removeEventListener(OVERLAY_CLOSE_EVENT, listener)
}

export async function openVerificationCodePiP(
  code: string,
  dateLabel: string,
): Promise<boolean> {
  const mode = getVerificationCodePipMode()
  if (mode === 'none') return false

  await closeVerificationCodePiP()

  if (mode === 'document') {
    try {
      const ok = await openDocumentPiP(code, dateLabel)
      if (ok) return true
    } catch {
      /* fallback */
    }
    return openOverlayPiP(code, dateLabel)
  }
  if (mode === 'video') {
    try {
      const ok = await openVideoPiP(code, dateLabel)
      if (ok) return true
    } catch {
      /* fallback */
    }
    return openOverlayPiP(code, dateLabel)
  }
  return openOverlayPiP(code, dateLabel)
}

async function openDocumentPiP(
  code: string,
  dateLabel: string,
): Promise<boolean> {
  const api = window.documentPictureInPicture
  if (!api) return false

  const pipWindow = await api.requestWindow({
    width: 300,
    height: 168,
  })

  pipWindow.document.body.style.margin = '0'
  pipWindow.document.body.style.background = '#1c1c1c'
  pipWindow.document.body.style.overflow = 'hidden'
  pipWindow.document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:Pretendard,'Apple SD Gothic Neo',sans-serif;color:#f5f0e8;text-align:center;padding:12px;box-sizing:border-box;">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.25em;color:#c8b882;">MOVEL</div>
      <div style="font-size:26px;font-weight:700;letter-spacing:0.12em;color:#c8b882;margin-top:10px;">${code}</div>
      <div style="font-size:11px;color:rgba(245,240,232,0.7);margin-top:10px;">${dateLabel}</div>
      <div style="font-size:10px;color:rgba(245,240,232,0.45);margin-top:14px;line-height:1.4;">건강앱과 함께<br/>캡처하세요</div>
    </div>
  `

  return true
}

async function openVideoPiP(
  code: string,
  dateLabel: string,
): Promise<boolean> {
  const width = 640
  const height = 360

  pipCanvas = document.createElement('canvas')
  pipCanvas.width = width
  pipCanvas.height = height
  const ctx = pipCanvas.getContext('2d')
  if (!ctx) return false

  drawCodeOnCanvas(ctx, width, height, code, dateLabel)

  const stream = pipCanvas.captureStream(1)
  pipVideo = document.createElement('video')
  pipVideo.muted = true
  pipVideo.playsInline = true
  pipVideo.autoplay = true
  pipVideo.srcObject = stream
  pipVideo.style.cssText =
    'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;'
  document.body.appendChild(pipVideo)

  await pipVideo.play()

  if (typeof pipVideo.requestPictureInPicture !== 'function') {
    cleanupVideoPiP()
    return false
  }

  await pipVideo.requestPictureInPicture()

  pipDrawTimer = setInterval(() => {
    if (!pipCanvas) return
    const c = pipCanvas.getContext('2d')
    if (c) drawCodeOnCanvas(c, width, height, code, dateLabel)
  }, 1000)

  pipVideo.addEventListener('leavepictureinpicture', cleanupVideoPiP, {
    once: true,
  })

  return true
}

export async function closeVerificationCodePiP(): Promise<void> {
  if (window.documentPictureInPicture?.window) {
    window.documentPictureInPicture.window.close()
  }

  if (document.pictureInPictureElement instanceof HTMLVideoElement) {
    try {
      await document.exitPictureInPicture()
    } catch {
      /* ignore */
    }
  }

  cleanupVideoPiP()
  cleanupOverlayPiP()
}

export function verificationCodePipButtonLabel(
  mode: VerificationCodePipMode,
  active: boolean,
): string {
  if (active) {
    return mode === 'overlay' ? '떠있는 창 닫기' : 'PiP 창 닫기'
  }
  return mode === 'overlay' ? '코드 떠있는 창' : '코드 PiP 창'
}

export function verificationCodePipHelpText(mode: VerificationCodePipMode): string {
  switch (mode) {
    case 'document':
      return '코드를 작은 창(PiP)으로 띄운 뒤 건강앱 화면과 함께 캡처할 수 있습니다.'
    case 'video':
      return '코드를 작은 플로팅 창으로 띄울 수 있습니다.'
    case 'overlay':
      return '「코드 떠있는 창」을 누르면 화면 위에 코드가 떠 있습니다. 건강앱으로 이동한 뒤 함께 캡처하세요.'
    default:
      return '이 브라우저는 PiP를 지원하지 않습니다. 전체화면 또는 분할 화면을 이용해 주세요.'
  }
}
