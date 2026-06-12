import { useEffect, useState } from 'react'
import { formatCurrency } from '../../api/members'
import {
  deleteCenterPassProduct,
  fetchCenterPassProducts,
  saveCenterPassProduct,
  type CenterPassProduct,
} from '../../api/centerPasses'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'

function emptyProduct(sortOrder: number): CenterPassProduct {
  return {
    id: '',
    label: '',
    duration_days: 30,
    list_amount: 0,
    description: 'PT 수업과 별개의 센터 시설 이용 기간권',
    is_active: false,
    sort_order: sortOrder,
    created_at: '',
    updated_at: '',
  }
}

export function CenterPassProductEditor() {
  const [products, setProducts] = useState<CenterPassProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        setProducts(await fetchCenterPassProducts())
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '센터 이용권 상품을 불러올 수 없습니다.',
        )
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  function updateProduct(index: number, patch: Partial<CenterPassProduct>) {
    setProducts((prev) =>
      prev.map((product, i) => (i === index ? { ...product, ...patch } : product)),
    )
  }

  async function handleSaveProduct(index: number) {
    const product = products[index]
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const saved = await saveCenterPassProduct({
        id: product.id || undefined,
        label: product.label,
        durationDays: product.duration_days,
        listAmount: Number(product.list_amount),
        description: product.description,
        isActive: product.is_active,
        sortOrder: product.sort_order,
      })
      setProducts((prev) =>
        prev.map((row, i) => (i === index ? saved : row)),
      )
      setMessage('센터 이용권 상품이 저장되었습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteProduct(index: number) {
    const product = products[index]
    if (
      !window.confirm(
        `「${product.label || '이 상품'}」을 삭제할까요?\n이미 부여된 이용권은 유지됩니다.`,
      )
    ) {
      return
    }

    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      if (product.id) {
        await deleteCenterPassProduct(product.id)
      }
      setProducts((prev) => prev.filter((_, i) => i !== index))
      setMessage('상품이 삭제되었습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddProduct() {
    const draft = emptyProduct(products.length + 1)
    setSaving(true)
    setError(null)
    try {
      const saved = await saveCenterPassProduct({
        label: '센터 이용권',
        durationDays: draft.duration_days,
        listAmount: 0,
        description: draft.description,
        isActive: false,
        sortOrder: draft.sort_order,
      })
      setProducts((prev) => [...prev, saved])
    } catch (err) {
      setError(err instanceof Error ? err.message : '상품 추가 실패')
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
        <h3 className="text-base font-semibold text-charcoal">센터 이용권 상품</h3>
        <p className="mt-1 text-sm text-muted">
          PT와 별개인 센터 시설 기간권입니다. 활성화된 상품만 결제 요청에
          표시됩니다.
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
        {products.map((product, index) => (
          <div key={product.id || index} className={`${cardClass} space-y-3 p-4`}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="min-w-0 sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted">상품명</span>
                <input
                  type="text"
                  lang="ko"
                  value={product.label}
                  onChange={(e) => updateProduct(index, { label: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-medium text-muted">이용 일수</span>
                <input
                  type="number"
                  min={1}
                  value={product.duration_days}
                  onChange={(e) =>
                    updateProduct(index, { duration_days: Number(e.target.value) })
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
                  value={product.list_amount}
                  onChange={(e) =>
                    updateProduct(index, { list_amount: Number(e.target.value) })
                  }
                  className={inputClass}
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">설명</span>
              <input
                type="text"
                lang="ko"
                value={product.description ?? ''}
                onChange={(e) => updateProduct(index, { description: e.target.value })}
                className={inputClass}
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={product.is_active}
                  onChange={(e) =>
                    updateProduct(index, { is_active: e.target.checked })
                  }
                />
                결제 요청에 사용
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">
                  {Number(product.list_amount) > 0
                    ? formatCurrency(Number(product.list_amount))
                    : '가격 미정'}
                </span>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleDeleteProduct(index)}
                  className="text-sm text-red-600 hover:underline disabled:opacity-50"
                >
                  삭제
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveProduct(index)}
                  className={btnPrimary}
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void handleAddProduct()}
        disabled={saving}
        className={btnOutline}
      >
        상품 추가
      </button>
    </div>
  )
}
