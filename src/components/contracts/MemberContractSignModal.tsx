import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CONTRACT_TERM_SECTIONS,
  CONTRACT_TYPE_LABELS,
} from '../../constants/contractTerms'
import {
  getContractSignatureUrl,
  signContract,
  type ContractInstance,
} from '../../api/contracts'
import { btnGold, btnOutline } from '../../styles/theme'
import { useContractCenterName } from '../../hooks/useContractCenterName'
import { useContractSettings } from '../../hooks/useContractSettings'
import { ContractDocument } from './ContractDocument'
import { SignaturePadModal } from './SignaturePadModal'

type Props = {
  open: boolean
  contract: ContractInstance | null
  memberId: string
  onClose: () => void
  onSigned: (contract: ContractInstance) => void
}

export function MemberContractSignModal({
  open,
  contract,
  memberId,
  onClose,
  onSigned,
}: Props) {
  const [terms, setTerms] = useState<Record<string, boolean>>({})
  const [signature, setSignature] = useState<string | null>(null)
  const [signatureModalOpen, setSignatureModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const centerName = useContractCenterName(contract)
  const { settings: contractSettings } = useContractSettings()

  useEffect(() => {
    if (!open) return
    setTerms({})
    setSignature(null)
    setSignatureModalOpen(false)
    setError(null)
  }, [open, contract?.id])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!open || !contract) return null

  const isSigned = contract.status === 'signed'
  const signatureUrl = getContractSignatureUrl(contract.signature_path)

  async function handleSubmit() {
    if (!contract) return
    if (isSigned) {
      onClose()
      return
    }
    if (!signature) {
      setError('서명을 입력해 주세요. 「서명하기」 버튼을 눌러 서명해 주세요.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const updated = await signContract({
        contractId: contract.id,
        memberId,
        termsAccepted: terms,
        signatureDataUrl: signature,
      })
      onSigned(updated)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '서명 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const modal = (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/50 p-0 sm:items-center sm:p-4">
        <div
          className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl border border-gold/30 bg-white shadow-xl sm:rounded-2xl"
          role="dialog"
          aria-labelledby="contract-sign-title"
        >
          <div className="border-b border-gold/20 px-5 py-4">
            <h3 id="contract-sign-title" className="text-lg font-bold text-charcoal">
              {CONTRACT_TYPE_LABELS[contract.contract_type]}
            </h3>
            <p className="mt-1 text-sm text-muted">
              결제 전 계약서 내용을 확인하고 서명해 주세요.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <ContractDocument
              contractType={contract.contract_type}
              fields={contract.field_data}
              centerName={centerName}
              contractSettings={contractSettings}
              signedAt={contract.signed_at}
              signatureUrl={signatureUrl}
              compact
            />

            {!isSigned && (
              <div className="mt-6 space-y-3 border-t border-gold/20 pt-4">
                <p className="text-sm font-semibold text-charcoal">약관 동의</p>
                {CONTRACT_TERM_SECTIONS.map((section) => (
                  <label
                    key={section.id}
                    className="flex items-start gap-2 rounded-lg border border-gold/20 bg-cream/30 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={Boolean(terms[section.id])}
                      onChange={(e) =>
                        setTerms((prev) => ({
                          ...prev,
                          [section.id]: e.target.checked,
                        }))
                      }
                      disabled={saving}
                    />
                    <span>
                      <span className="font-medium">{section.title}</span>
                      {section.required && (
                        <span className="text-red-600"> (필수)</span>
                      )}
                      {section.id === 'refund' && (
                        <span className="mt-0.5 block text-xs text-muted">
                          환불 기준·절차를 확인했습니다.
                        </span>
                      )}
                    </span>
                  </label>
                ))}

                <div className="rounded-xl border border-gold/25 bg-cream/30 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-charcoal">서명</p>
                    <button
                      type="button"
                      onClick={() => setSignatureModalOpen(true)}
                      disabled={saving}
                      className={`${btnGold} px-3 py-1.5 text-xs`}
                    >
                      {signature ? '서명 다시하기' : '서명하기'}
                    </button>
                  </div>
                  {signature ? (
                    <img
                      src={signature}
                      alt="입력한 서명 미리보기"
                      className="mt-3 max-h-24 rounded-lg border border-gold/20 bg-white"
                    />
                  ) : (
                    <p className="mt-2 text-xs text-muted">
                      「서명하기」를 누르면 전용 서명 창이 열립니다.
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-2 border-t border-gold/20 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`flex-1 ${btnOutline}`}
            >
              {isSigned ? '닫기' : '나중에'}
            </button>
            {!isSigned && (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={saving}
                className={`flex-1 ${btnGold}`}
              >
                {saving ? '저장 중…' : '서명 완료'}
              </button>
            )}
          </div>
        </div>
      </div>

      <SignaturePadModal
        open={signatureModalOpen}
        initialSignature={signature}
        disabled={saving}
        onClose={() => setSignatureModalOpen(false)}
        onConfirm={setSignature}
      />
    </>
  )

  return createPortal(modal, document.body)
}
