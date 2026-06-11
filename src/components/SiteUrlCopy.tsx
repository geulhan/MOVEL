import { useState } from 'react'
import { copyText } from '../lib/siteUrl'
import { btnOutline } from '../styles/theme'

type Props = {
  url: string
  label?: string
  className?: string
}

export function SiteUrlCopy({ url, label, className = '' }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const ok = await copyText(url)
    if (!ok) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={className}>
      {label && (
        <p className="mb-1 text-xs font-medium text-charcoal/70">{label}</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="block min-w-0 flex-1 break-all rounded-lg border border-gold/30 bg-cream px-3 py-2 text-left text-xs font-semibold text-charcoal">
          {url}
        </code>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className={`shrink-0 ${btnOutline}`}
        >
          {copied ? '복사됨!' : '링크 복사'}
        </button>
      </div>
    </div>
  )
}
