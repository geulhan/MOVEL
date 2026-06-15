import type { ContractTemplateKey } from '../../constants/contractTerms'
import { CONTRACT_TEMPLATE_LABELS } from '../../constants/contractTerms'
import {
  buildSamplePurchaseFields,
  buildSampleTransferFields,
} from '../../lib/contracts/contractSampleData'
import { btnOutline, btnPrimary } from '../../styles/theme'
import { ContractDocument } from './ContractDocument'
import { PtMembershipTransferDocument } from './PtMembershipTransferDocument'

type Props = {
  open: boolean
  templateKey: ContractTemplateKey | null
  centerName: string
  onClose: () => void
}

export function ContractDraftPreviewModal({
  open,
  templateKey,
  centerName,
  onClose,
}: Props) {
  if (!open || !templateKey) return null

  const title = CONTRACT_TEMPLATE_LABELS[templateKey]

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
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
            계약서 초안
          </p>
          <h3 className="mt-1 text-lg font-bold text-charcoal">{title}</h3>
          <p className="mt-1 text-sm text-muted">
            {centerName} · 예시 데이터가 채워진 양식입니다.
          </p>
        </div>
        <div
          id="contract-print-surface"
          className="flex-1 overflow-y-auto px-5 py-4"
        >
          {templateKey === 'pt_membership_transfer' ? (
            <PtMembershipTransferDocument
              fields={buildSampleTransferFields(centerName)}
              centerName={centerName}
              draft
            />
          ) : (
            <ContractDocument
              contractType={templateKey}
              fields={buildSamplePurchaseFields(centerName, templateKey)}
              centerName={centerName}
              draft
              compact
            />
          )}
        </div>
        <div className="contract-view-modal__actions flex gap-2 border-t border-gold/20 px-5 py-4">
          <button type="button" onClick={onClose} className={`flex-1 ${btnOutline}`}>
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
