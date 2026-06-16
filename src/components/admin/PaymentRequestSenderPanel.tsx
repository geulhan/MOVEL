import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMembers, formatPhone } from '../../api/members'
import {
  PAYMENT_CATEGORY_LABELS,
  type PaymentCategory,
} from '../../constants/paymentCategories'
import { MemberSearchCombobox } from './MemberSearchCombobox'
import { PaymentRequestModal } from '../member-detail/PaymentRequestModal'
import { btnGold, cardClass } from '../../styles/theme'
import type { Member } from '../../types/database'

type Props = {
  initialCategory: PaymentCategory
  onSent?: () => void
  onError?: (message: string) => void
  onToast?: (message: string) => void
}

export function PaymentRequestSenderPanel({
  initialCategory,
  onSent,
  onError,
  onToast,
}: Props) {
  const [searchInput, setSearchInput] = useState('')
  const [suggestions, setSuggestions] = useState<Member[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)

  const categoryLabel = PAYMENT_CATEGORY_LABELS[initialCategory]

  const handleModalError = useCallback(
    (message: string) => {
      setPanelError(message)
      onError?.(message)
    },
    [onError],
  )

  const handleModalSuccess = useCallback(async () => {
    setPanelError(null)
    onToast?.(`${selectedMember?.name ?? '회원'}님에게 결제 요청을 보냈습니다.`)
    onSent?.()
  }, [onSent, onToast, selectedMember?.name])

  useEffect(() => {
    const term = searchInput.trim()
    if (!term) {
      setSuggestions([])
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    const timer = window.setTimeout(() => {
      void fetchMembers(term)
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
        .finally(() => setSearchLoading(false))
    }, 250)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  function handleSelectMember(member: Member) {
    setSelectedMember(member)
    setSearchInput('')
    setSuggestions([])
    setPanelError(null)
  }

  function handleClearSearch() {
    setSuggestions([])
  }

  function handleClearMember() {
    setSelectedMember(null)
    setSearchInput('')
    setSuggestions([])
  }

  function openRequestModal() {
    if (!selectedMember) return
    setPanelError(null)
    setModalOpen(true)
  }

  const showPickHint =
    !selectedMember && searchInput.trim().length > 0 && suggestions.length > 0

  return (
    <section
      className={`${cardClass} relative z-10 space-y-4 border-2 border-gold/40 bg-gradient-to-br from-gold/10 via-white to-cream/40 p-5`}
    >
      <div>
        <h3 className="text-base font-semibold text-charcoal">회원 선택 · 결제 요청</h3>
        <p className="mt-1 text-sm text-muted">
          <strong className="text-charcoal">{categoryLabel}</strong> 상품으로 회원에게
          결제 요청을 보냅니다.
        </p>
      </div>

      <ol className="space-y-3 text-sm">
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-charcoal">
            1
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-medium text-charcoal">회원 검색 후 목록에서 선택</p>
            <MemberSearchCombobox
              value={searchInput}
              suggestions={suggestions}
              loading={searchLoading}
              elevated
              onChange={setSearchInput}
              onSelect={handleSelectMember}
              onClear={handleClearSearch}
            />
            {showPickHint && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                검색 결과에서 회원 이름을 <strong>탭</strong>해 선택해 주세요.
              </p>
            )}
          </div>
        </li>

        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-charcoal">
            2
          </span>
          <div className="min-w-0 flex-1 space-y-3">
            <p className="font-medium text-charcoal">결제 요청 보내기</p>

            {selectedMember ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gold/30 bg-white px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gold-dark">선택된 회원</p>
                  <p className="mt-0.5 font-semibold text-charcoal">
                    {selectedMember.name}
                    <span className="ml-2 text-sm font-normal text-muted">
                      {formatPhone(selectedMember.phone)}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearMember}
                  className="shrink-0 rounded-lg border border-gold/40 px-3 py-1.5 text-xs text-muted transition hover:bg-cream"
                >
                  변경
                </button>
                <Link
                  to={`/admin/member/${selectedMember.id}/pt`}
                  className="shrink-0 rounded-lg border border-gold/40 px-3 py-1.5 text-xs text-charcoal transition hover:bg-cream"
                >
                  회원 상세
                </Link>
              </div>
            ) : (
              <p className="text-xs text-muted">
                1단계에서 회원을 선택하면 아래 버튼이 활성화됩니다.
              </p>
            )}

            <button
              type="button"
              onClick={openRequestModal}
              disabled={!selectedMember}
              className={`w-full px-6 py-3.5 text-base font-bold sm:w-auto ${btnGold} disabled:cursor-not-allowed disabled:opacity-45`}
            >
              {selectedMember
                ? `${selectedMember.name}님에게 결제 요청 보내기`
                : '회원 선택 후 결제 요청 보내기'}
            </button>
          </div>
        </li>
      </ol>

      {panelError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {panelError}
        </p>
      )}

      <PaymentRequestModal
        memberId={selectedMember?.id ?? ''}
        memberName={selectedMember?.name ?? ''}
        initialCategory={initialCategory}
        lockCategory
        availableCategories={[initialCategory]}
        open={modalOpen && selectedMember != null}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
        onError={handleModalError}
      />
    </section>
  )
}
