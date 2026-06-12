import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMembers, formatPhone } from '../../api/members'
import { MemberSearchCombobox } from './MemberSearchCombobox'
import { PaymentRequestModal } from '../member-detail/PaymentRequestModal'
import type { PaymentCategory } from '../../constants/paymentCategories'
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

  return (
    <section className={`${cardClass} space-y-4 p-5`}>
      <div>
        <h3 className="text-base font-semibold text-charcoal">회원 선택 · 결제 요청</h3>
        <p className="mt-1 text-sm text-muted">
          위에서 선택한 상품 카테고리로 회원에게 결제 요청을 보냅니다. 회원 앱
          결제 탭과 계약서 서명 후 센터 결제로 이어집니다.
        </p>
      </div>

      {!selectedMember ? (
        <MemberSearchCombobox
          value={searchInput}
          suggestions={suggestions}
          loading={searchLoading}
          onChange={setSearchInput}
          onSelect={handleSelectMember}
          onClear={handleClearSearch}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/30 bg-cream/40 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
              선택된 회원
            </p>
            <p className="mt-1 font-semibold text-charcoal">
              {selectedMember.name}
              <span className="ml-2 text-sm font-normal text-muted">
                {formatPhone(selectedMember.phone)}
              </span>
            </p>
            {selectedMember.trainer_name && (
              <p className="mt-0.5 text-xs text-muted">
                담당 {selectedMember.trainer_name}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setPanelError(null)
                setModalOpen(true)
              }}
              className={btnGold}
            >
              결제 요청 작성
            </button>
            <button
              type="button"
              onClick={handleClearMember}
              className="rounded-lg border border-gold/40 px-3 py-2 text-sm text-muted transition hover:bg-white"
            >
              회원 변경
            </button>
            <Link
              to={`/admin/member/${selectedMember.id}/pt`}
              className="rounded-lg border border-gold/40 px-3 py-2 text-sm text-charcoal transition hover:bg-white"
            >
              회원 상세
            </Link>
          </div>
        </div>
      )}

      {panelError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {panelError}
        </p>
      )}

      <PaymentRequestModal
        memberId={selectedMember?.id ?? ''}
        memberName={selectedMember?.name ?? ''}
        initialCategory={initialCategory}
        open={modalOpen && selectedMember != null}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
        onError={handleModalError}
      />
    </section>
  )
}
