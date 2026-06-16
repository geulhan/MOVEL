import { useEffect, useState } from 'react'
import {
  fetchSessionPassPricing,
  saveSessionPassPricing,
} from '../../api/pricing'
import { formatCurrency } from '../../api/members'
import {
  PAYMENT_CATEGORY_LABELS,
  type SessionPaymentCategory,
} from '../../constants/paymentCategories'
import type { PtPackage } from '../../constants/pricing'
import { getErrorMessage } from '../../lib/errors'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'

function emptyPackage(sortOrder: number): PtPackage {
  return {
    id: `pkg_${Date.now()}`,
    label: '',
    sessions: 10,
    amount: 0,
    is_active: true,
    sort_order: sortOrder,
  }
}

type Props = {
  category: SessionPaymentCategory
}

export function SessionPassPricingEditor({ category }: Props) {
  const categoryLabel = PAYMENT_CATEGORY_LABELS[category]
  const [packages, setPackages] = useState<PtPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const pricing = await fetchSessionPassPricing(category)
        setPackages(pricing.packages)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [category])

  function updatePackage(index: number, patch: Partial<PtPackage>) {
    setPackages((prev) =>
      prev.map((pkg, i) => (i === index ? { ...pkg, ...patch } : pkg)),
    )
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await saveSessionPassPricing(category, { packages })
      setMessage('기본 가격이 저장되었습니다.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">불러오는 중…</p>
  }

  return (
    <div className="space-y-4">
      <div className={`${cardClass} card-pad`}>
        <h3 className="text-base font-semibold text-charcoal">{categoryLabel} 기본 가격</h3>
        <p className="mt-1 text-sm text-muted">
          결제 요청·회원 온라인 결제 시 기본으로 제시되는 패키지입니다.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      <div className="space-y-3">
        {packages.map((pkg, index) => (
          <div
            key={pkg.id}
            className={`${cardClass} grid gap-3 p-4 sm:grid-cols-[1fr_100px_140px_auto_auto]`}
          >
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-muted">패키지명</span>
              <input
                type="text"
                lang="ko"
                value={pkg.label}
                onChange={(e) => updatePackage(index, { label: e.target.value })}
                className={inputClass}
                placeholder={`${categoryLabel} 10회`}
              />
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-muted">횟수</span>
              <input
                type="number"
                min={1}
                value={pkg.sessions}
                onChange={(e) =>
                  updatePackage(index, { sessions: Number(e.target.value) })
                }
                className={inputClass}
              />
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-muted">정가 (원)</span>
              <input
                type="number"
                min={0}
                step={1000}
                value={pkg.amount}
                onChange={(e) =>
                  updatePackage(index, { amount: Number(e.target.value) })
                }
                className={inputClass}
              />
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={pkg.is_active}
                onChange={(e) =>
                  updatePackage(index, { is_active: e.target.checked })
                }
              />
              <span>사용</span>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setPackages((prev) => prev.filter((_, i) => i !== index))}
                className="text-sm text-red-600 hover:underline"
              >
                삭제
              </button>
            </div>
            <p className="sm:col-span-5 text-xs text-muted">
              회당 {formatCurrency(Math.round(pkg.amount / Math.max(pkg.sessions, 1)))}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            setPackages((prev) => [...prev, emptyPackage(prev.length + 1)])
          }
          className={btnOutline}
        >
          패키지 추가
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className={btnPrimary}
        >
          {saving ? '저장 중…' : '기본 가격 저장'}
        </button>
      </div>
    </div>
  )
}
