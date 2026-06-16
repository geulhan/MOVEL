import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { formatCurrency, todayDateString } from '../../api/members'
import { fetchCenterPassProducts } from '../../api/centerPasses'
import {
  fetchFacilityProducts,
  getActiveFacilityProducts,
} from '../../api/facilityProducts'
import { createPaymentRequest } from '../../api/paymentRequests'
import { fetchSessionPassPricing, getActivePackages } from '../../api/pricing'
import {
  PAYMENT_CATEGORIES,
  PAYMENT_CATEGORY_LABELS,
  isPeriodPaymentCategory,
  isSessionPaymentCategory,
  type PaymentCategory,
} from '../../constants/paymentCategories'
import type { PtPackage } from '../../constants/pricing'
import type { CenterPassProduct, FacilityProduct } from '../../types/database'
import { btnOutline, btnPrimary, inputClass } from '../../styles/theme'

type Props = {
  memberId: string
  memberName: string
  open: boolean
  initialCategory?: PaymentCategory
  lockCategory?: boolean
  availableCategories?: PaymentCategory[]
  onClose: () => void
  onSuccess: () => Promise<void>
  onError: (message: string) => void
}

type CatalogItem = {
  id: string
  label: string
  listAmount: number
  sessions?: number
  durationDays?: number
}

export function PaymentRequestModal({
  memberId,
  memberName,
  open,
  initialCategory = 'pt',
  lockCategory = false,
  availableCategories = PAYMENT_CATEGORIES,
  onClose,
  onSuccess,
  onError,
}: Props) {
  const [category, setCategory] = useState<PaymentCategory>(initialCategory)
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [packageId, setPackageId] = useState('')
  const [label, setLabel] = useState('')
  const [sessions, setSessions] = useState('10')
  const [durationDays, setDurationDays] = useState('30')
  const [startsAt, setStartsAt] = useState(todayDateString())
  const [listAmount, setListAmount] = useState('0')
  const [amount, setAmount] = useState('0')
  const [discountNote, setDiscountNote] = useState('')
  const [note, setNote] = useState('')
  const [loadingPackages, setLoadingPackages] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    if (!open) return
    setCategory(initialCategory)
    setModalError(null)
  }, [open, initialCategory])

  useEffect(() => {
    if (!open) return
    setLoadingPackages(true)
    setModalError(null)

    void (async () => {
      try {
        let items: CatalogItem[] = []
        if (isSessionPaymentCategory(category)) {
          const pricing = await fetchSessionPassPricing(category)
          items = getActivePackages(pricing).map((pkg: PtPackage) => ({
            id: pkg.id,
            label: pkg.label,
            listAmount: pkg.amount,
            sessions: pkg.sessions,
          }))
        } else if (category === 'center_pass') {
          const products = await fetchCenterPassProducts()
          items = products
            .filter((product: CenterPassProduct) => product.is_active)
            .map((product) => ({
              id: product.id,
              label: product.label,
              listAmount: Number(product.list_amount),
              durationDays: product.duration_days,
            }))
        } else {
          const products = await fetchFacilityProducts()
          items = getActiveFacilityProducts(products).map((product: FacilityProduct) => ({
            id: product.id,
            label: product.label,
            listAmount: Number(product.list_amount),
            durationDays: product.duration_days,
          }))
        }

        setCatalog(items)
        if (items[0]) {
          applyCatalogItem(items[0])
          setPackageId(items[0].id)
        } else {
          setPackageId('')
          setLabel('')
          setListAmount('0')
          setAmount('0')
        }
      } catch {
        const message = '상품 목록을 불러올 수 없습니다. 아래에서 직접 입력해 주세요.'
        setModalError(message)
        onErrorRef.current?.(message)
      } finally {
        setLoadingPackages(false)
      }
    })()
  }, [open, category])

  const discountAmount = useMemo(() => {
    const list = Number(listAmount.replace(/,/g, ''))
    const final = Number(amount.replace(/,/g, ''))
    if (!Number.isFinite(list) || !Number.isFinite(final)) return 0
    return Math.max(0, list - final)
  }, [listAmount, amount])

  function applyCatalogItem(item: CatalogItem) {
    setLabel(item.label)
    setListAmount(String(item.listAmount))
    setAmount(String(item.listAmount))
    if (item.sessions != null) setSessions(String(item.sessions))
    if (item.durationDays != null) setDurationDays(String(item.durationDays))
  }

  function handlePackageChange(id: string) {
    setPackageId(id)
    const item = catalog.find((row) => row.id === id)
    if (item) applyCatalogItem(item)
  }

  function reportError(message: string) {
    setModalError(message)
    onError(message)
  }

  function handleClose() {
    if (saving) return
    setModalError(null)
    onClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!memberId.trim()) {
      reportError('회원을 선택해 주세요.')
      return
    }

    const parsedSessions = Number(sessions)
    const parsedDuration = Number(durationDays)
    const parsedList = Number(listAmount.replace(/,/g, ''))
    const parsedAmount = Number(amount.replace(/,/g, ''))

    if (!label.trim()) {
      reportError('결제 요청 제목을 입력해 주세요.')
      return
    }
    if (isSessionPaymentCategory(category)) {
      if (!Number.isInteger(parsedSessions) || parsedSessions < 1) {
        reportError('수업 횟수는 1 이상이어야 합니다.')
        return
      }
    } else {
      if (!Number.isInteger(parsedDuration) || parsedDuration < 1) {
        reportError('이용 기간(일)은 1 이상이어야 합니다.')
        return
      }
      if (!startsAt.trim()) {
        reportError('이용 시작일을 입력해 주세요.')
        return
      }
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      reportError('결제 금액을 올바르게 입력해 주세요.')
      return
    }

    setSaving(true)
    setModalError(null)
    try {
      await createPaymentRequest({
        memberId,
        category,
        packageId: packageId || null,
        label: label.trim(),
        sessions: isSessionPaymentCategory(category) ? parsedSessions : null,
        durationDays: isSessionPaymentCategory(category) ? null : parsedDuration,
        startsAt: isPeriodPaymentCategory(category) ? startsAt : null,
        listAmount: parsedList,
        amount: parsedAmount,
        discountNote: discountNote.trim() || null,
        note: note.trim() || null,
      })
      setModalError(null)
      onClose()
      await onSuccess()
    } catch (err) {
      reportError(err instanceof Error ? err.message : '결제 요청 실패')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const dialog = (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-charcoal/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="닫기"
        onClick={handleClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gold/30 bg-white p-5 shadow-xl sm:p-6">
        <h3 className="text-lg font-semibold text-charcoal">결제 요청 보내기</h3>
        <p className="mt-1 text-sm text-muted">
          {memberName}님 회원 앱에 결제 요청이 표시됩니다.
        </p>

        {!lockCategory && availableCategories.length > 1 && (
          <nav className="chip-scroll mt-4 -mx-1 px-1">
            {availableCategories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`chip ${category === item ? 'chip-active' : 'chip-inactive'}`}
              >
                {PAYMENT_CATEGORY_LABELS[item]}
              </button>
            ))}
          </nav>
        )}

        {modalError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {modalError}
          </p>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-charcoal/70">
              상품 선택
            </span>
            <select
              value={packageId}
              onChange={(e) => handlePackageChange(e.target.value)}
              className={inputClass}
              disabled={loadingPackages || saving || catalog.length === 0}
            >
              {catalog.length === 0 ? (
                <option value="">활성 상품 없음 — 결제 관리에서 설정</option>
              ) : (
                catalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} · {formatCurrency(item.listAmount)}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-charcoal/70">
              요청 제목
            </span>
            <input
              type="text"
              lang="ko"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={inputClass}
              disabled={saving}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            {isSessionPaymentCategory(category) ? (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-charcoal/70">
                  수업 횟수
                </span>
                <input
                  type="number"
                  min={1}
                  value={sessions}
                  onChange={(e) => setSessions(e.target.value)}
                  className={inputClass}
                  disabled={saving}
                />
              </label>
            ) : (
              <>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-charcoal/70">
                    이용 기간 (일)
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className={inputClass}
                    disabled={saving}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-charcoal/70">
                    이용 시작일
                  </span>
                  <input
                    type="date"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className={inputClass}
                    disabled={saving}
                  />
                </label>
              </>
            )}
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-charcoal/70">
                정가 (원)
              </span>
              <input
                type="number"
                min={0}
                step={1000}
                value={listAmount}
                onChange={(e) => setListAmount(e.target.value)}
                className={inputClass}
                disabled={saving}
              />
            </label>
          </div>

          {isPeriodPaymentCategory(category) && (
            <p className="text-xs text-muted">
              결제 완료 시 설정한 시작일부터 이용권이 자동 등록됩니다.
            </p>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-charcoal/70">
              결제 금액 (원)
            </span>
            <input
              type="number"
              min={0}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
              disabled={saving}
            />
            {discountAmount > 0 && (
              <p className="mt-1 text-xs font-medium text-emerald-700">
                할인 {formatCurrency(discountAmount)} 적용
              </p>
            )}
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-charcoal/70">
              할인 사유 (회원에게 표시)
            </span>
            <input
              type="text"
              lang="ko"
              value={discountNote}
              onChange={(e) => setDiscountNote(e.target.value)}
              placeholder="재등록 할인, 이벤트 등"
              className={inputClass}
              disabled={saving}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-charcoal/70">
              관리자 메모 (선택)
            </span>
            <input
              type="text"
              lang="ko"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputClass}
              disabled={saving}
            />
          </label>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || loadingPackages}
              className={`flex-1 ${btnPrimary}`}
            >
              {saving ? '보내는 중…' : '결제 요청 보내기'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className={btnOutline}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}
