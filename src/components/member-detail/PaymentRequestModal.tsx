import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { formatCurrency } from '../../api/members'
import { createPaymentRequest } from '../../api/paymentRequests'
import { fetchPtPricing, getActivePackages } from '../../api/pricing'
import type { PtPackage } from '../../constants/pricing'
import { btnOutline, btnPrimary, inputClass } from '../../styles/theme'

type Props = {
  memberId: string
  memberName: string
  open: boolean
  onClose: () => void
  onSuccess: () => Promise<void>
  onError: (message: string) => void
}

export function PaymentRequestModal({
  memberId,
  memberName,
  open,
  onClose,
  onSuccess,
  onError,
}: Props) {
  const [packages, setPackages] = useState<PtPackage[]>([])
  const [packageId, setPackageId] = useState('')
  const [label, setLabel] = useState('')
  const [sessions, setSessions] = useState('10')
  const [listAmount, setListAmount] = useState('0')
  const [amount, setAmount] = useState('0')
  const [discountNote, setDiscountNote] = useState('')
  const [note, setNote] = useState('')
  const [loadingPackages, setLoadingPackages] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoadingPackages(true)
    void fetchPtPricing()
      .then((pricing) => {
        const active = getActivePackages(pricing)
        setPackages(active)
        if (active[0]) {
          applyPackage(active[0])
          setPackageId(active[0].id)
        }
      })
      .catch(() => onError('기본 가격을 불러올 수 없습니다.'))
      .finally(() => setLoadingPackages(false))
  }, [open, onError])

  const discountAmount = useMemo(() => {
    const list = Number(listAmount.replace(/,/g, ''))
    const final = Number(amount.replace(/,/g, ''))
    if (!Number.isFinite(list) || !Number.isFinite(final)) return 0
    return Math.max(0, list - final)
  }, [listAmount, amount])

  function applyPackage(pkg: PtPackage) {
    setLabel(pkg.label)
    setSessions(String(pkg.sessions))
    setListAmount(String(pkg.amount))
    setAmount(String(pkg.amount))
  }

  function handlePackageChange(id: string) {
    setPackageId(id)
    const pkg = packages.find((item) => item.id === id)
    if (pkg) applyPackage(pkg)
  }

  function handleClose() {
    if (saving) return
    onClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsedSessions = Number(sessions)
    const parsedList = Number(listAmount.replace(/,/g, ''))
    const parsedAmount = Number(amount.replace(/,/g, ''))

    if (!label.trim()) {
      onError('결제 요청 제목을 입력해 주세요.')
      return
    }
    if (!Number.isInteger(parsedSessions) || parsedSessions < 1) {
      onError('PT 횟수는 1 이상이어야 합니다.')
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      onError('결제 금액을 올바르게 입력해 주세요.')
      return
    }

    setSaving(true)
    try {
      await createPaymentRequest({
        memberId,
        packageId: packageId || null,
        label: label.trim(),
        sessions: parsedSessions,
        listAmount: parsedList,
        amount: parsedAmount,
        discountNote: discountNote.trim() || null,
        note: note.trim() || null,
      })
      onClose()
      await onSuccess()
    } catch (err) {
      onError(err instanceof Error ? err.message : '결제 요청 실패')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/50 p-4 sm:items-center"
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
          {memberName}님 회원 앱에 결제 요청이 표시됩니다. 할인가를 적용할 수
          있습니다.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-charcoal/70">
              기본 패키지
            </span>
            <select
              value={packageId}
              onChange={(e) => handlePackageChange(e.target.value)}
              className={inputClass}
              disabled={loadingPackages || saving}
            >
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.label} · {formatCurrency(pkg.amount)}
                </option>
              ))}
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
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-charcoal/70">
                PT 횟수
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
}
