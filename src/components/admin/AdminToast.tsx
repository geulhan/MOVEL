import { useEffect, useState } from 'react'

type Props = {
  message: string | null
  onClear?: () => void
  durationMs?: number
}

export function AdminToast({ message, onClear, durationMs = 3000 }: Props) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => onClear?.(), durationMs)
    return () => window.clearTimeout(timer)
  }, [message, onClear, durationMs])

  if (!message) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-gold/30 bg-charcoal px-4 py-2.5 text-sm font-medium text-cream shadow-lg">
      {message}
    </div>
  )
}

export function useAdminToast() {
  const [toast, setToast] = useState<string | null>(null)
  return { toast, setToast, clearToast: () => setToast(null) }
}
