import { useEffect, useRef, useState } from 'react'
import { btnOutline } from '../../styles/theme'

type Props = {
  onChange: (dataUrl: string | null) => void
  disabled?: boolean
  canvasClassName?: string
}

export function SignaturePad({
  onChange,
  disabled = false,
  canvasClassName = 'h-36',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const hasStrokeRef = useRef(false)
  const [hasStroke, setHasStroke] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      const saved = hasStrokeRef.current ? canvas.toDataURL('image/png') : null
      canvas.width = Math.floor(rect.width * ratio)
      canvas.height = Math.floor(rect.height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(ratio, ratio)
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#1a1a1a'
      if (saved) {
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height)
        }
        img.src = saved
      }
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  function startDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    event.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    drawingRef.current = true
    canvas.setPointerCapture(event.pointerId)
    const { x, y } = getPoint(event)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const { x, y } = getPoint(event)
    ctx.lineTo(x, y)
    ctx.stroke()
    hasStrokeRef.current = true
    setHasStroke(true)
    onChange(canvas.toDataURL('image/png'))
  }

  function endDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    drawingRef.current = false
    const canvas = canvasRef.current
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasStrokeRef.current = false
    setHasStroke(false)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-charcoal">서명</p>
        <button
          type="button"
          onClick={clear}
          disabled={disabled || !hasStroke}
          className={`${btnOutline} px-3 py-1 text-xs`}
        >
          지우기
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className={`${canvasClassName} w-full touch-none rounded-xl border border-gold/30 bg-white`}
        onPointerDown={startDraw}
        onPointerMove={draw}
        onPointerUp={endDraw}
        onPointerLeave={endDraw}
        onPointerCancel={endDraw}
      />
      <p className="text-xs text-muted">손가락 또는 마우스로 서명해 주세요.</p>
    </div>
  )
}
