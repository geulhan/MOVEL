import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { btnGold, btnOutline } from '../../styles/theme'
import { SignaturePad } from './SignaturePad'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: (dataUrl: string) => void
  initialSignature?: string | null
  disabled?: boolean
}

export function SignaturePadModal({
  open,
  onClose,
  onConfirm,
  initialSignature = null,
  disabled = false,
}: Props) {
  const [signature, setSignature] = useState<string | null>(initialSignature)

  useEffect(() => {
    if (!open) return
    setSignature(initialSignature)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open, initialSignature])

  if (!open) return null

  function handleConfirm() {
    if (!signature) return
    onConfirm(signature)
    onClose()
  }

  const dialog = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-charcoal/65 p-4 touch-none"
      role="presentation"
      onPointerDown={(event) => event.preventDefault()}
    >
      <div
        className="flex w-full max-w-md flex-col rounded-2xl border border-gold/30 bg-white shadow-2xl"
        role="dialog"
        aria-labelledby="signature-modal-title"
        aria-modal="true"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-gold/20 px-5 py-4">
          <h3 id="signature-modal-title" className="text-lg font-bold text-charcoal">
            서명하기
          </h3>
          <p className="mt-1 text-sm text-muted">
            아래 영역에 손가락으로 서명해 주세요.
          </p>
        </div>

        <div className="px-5 py-4">
          <SignaturePad
            onChange={setSignature}
            disabled={disabled}
            canvasClassName="h-52"
          />
        </div>

        <div className="flex gap-2 border-t border-gold/20 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className={`flex-1 ${btnOutline}`}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={disabled || !signature}
            className={`flex-1 ${btnGold}`}
          >
            서명 적용
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}
