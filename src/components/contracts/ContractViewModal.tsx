import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
} from '../../constants/contractTerms'
import {
  getContractSignatureUrl,
  type ContractInstance,
} from '../../api/contracts'
import { btnOutline, btnPrimary } from '../../styles/theme'
import { ContractDocument } from './ContractDocument'

type Props = {
  open: boolean
  contract: ContractInstance | null
  memberName?: string
  onClose: () => void
}

export function ContractViewModal({
  open,
  contract,
  memberName,
  onClose,
}: Props) {
  if (!open || !contract) return null

  function handlePrint() {
    document.body.classList.add('contract-printing')
    window.print()
    window.addEventListener(
      'afterprint',
      () => {
        document.body.classList.remove('contract-printing')
      },
      { once: true },
    )
  }

  return (
    <div className="contract-view-modal fixed inset-0 z-50 flex items-end justify-center bg-charcoal/50 p-4 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-gold/30 bg-white shadow-xl">
        <div className="contract-view-modal__header border-b border-gold/20 px-5 py-4">
          <h3 className="text-lg font-bold text-charcoal">
            {CONTRACT_TYPE_LABELS[contract.contract_type]}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {memberName ? `${memberName} · ` : ''}
            {CONTRACT_STATUS_LABELS[contract.status]}
            {contract.signed_at && (
              <span className="ml-1">
                · 서명{' '}
                {new Date(contract.signed_at).toLocaleString('ko-KR', {
                  timeZone: 'Asia/Seoul',
                })}
              </span>
            )}
          </p>
        </div>
        <div
          id="contract-print-surface"
          className="flex-1 overflow-y-auto px-5 py-4"
        >
          <ContractDocument
            contractType={contract.contract_type}
            fields={contract.field_data}
            signedAt={contract.signed_at}
            signatureUrl={getContractSignatureUrl(contract.signature_path)}
          />
        </div>
        <div className="contract-view-modal__actions flex gap-2 border-t border-gold/20 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 ${btnOutline}`}
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className={`flex-1 ${btnPrimary}`}
          >
            인쇄
          </button>
        </div>
      </div>
    </div>
  )
}
