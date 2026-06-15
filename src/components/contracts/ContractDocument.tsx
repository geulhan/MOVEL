import {
  applyCenterNameToContractTerms,
  CONTRACT_TYPE_LABELS,
  type ContractType,
} from '../../constants/contractTerms'
import { formatCurrency } from '../../api/members'
import type { ContractFieldData } from '../../lib/contracts/buildContractFields'

type Props = {
  contractType: ContractType
  fields: ContractFieldData
  centerName?: string
  signedAt?: string | null
  signatureUrl?: string | null
  compact?: boolean
}

function formatSignedAt(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

export function ContractDocument({
  contractType,
  fields,
  centerName,
  signedAt,
  signatureUrl,
  compact = false,
}: Props) {
  const title = CONTRACT_TYPE_LABELS[contractType]
  const sectionClass = compact ? 'space-y-3 text-xs' : 'space-y-4 text-sm'
  const displayCenterName = centerName?.trim() || fields.centerName.trim() || '센터'
  const termSections = applyCenterNameToContractTerms(displayCenterName)

  return (
    <article className={`${sectionClass} text-charcoal`}>
      <header className="border-b border-gold/30 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
          {displayCenterName}
        </p>
        <h2 className="mt-1 text-xl font-bold">{title}</h2>
        <p className="mt-2 text-muted">
          계약 당사자: {displayCenterName}(센터) · {fields.memberName}(
          {fields.memberPhone})
        </p>
      </header>

      <section>
        <h3 className="font-semibold">구매 내역</h3>
        <dl className="mt-2 grid gap-2 rounded-xl border border-gold/20 bg-cream/40 p-4">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">상품명</dt>
            <dd className="font-medium text-right">{fields.productLabel}</dd>
          </div>
          {contractType === 'pt_purchase' && (
            <>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">PT 횟수</dt>
                <dd className="font-medium tabular-nums">
                  {fields.ptSessions ?? '-'}회
                </dd>
              </div>
              {fields.trainerName && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">담당 트레이너</dt>
                  <dd className="font-medium">{fields.trainerName}</dd>
                </div>
              )}
            </>
          )}
          {contractType === 'center_pass_purchase' && (
            <>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">센터 이용권</dt>
                <dd className="font-medium text-right">
                  {fields.passPeriod ?? '없음'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">라커</dt>
                <dd className="font-medium text-right">
                  {fields.lockerPeriod ?? '없음'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">수건</dt>
                <dd className="font-medium text-right">
                  {fields.towelPeriod ?? '없음'}
                </dd>
              </div>
              {fields.facilityDetail && fields.passPeriod === '없음' && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">부가 서비스</dt>
                  <dd className="font-medium text-right">
                    {fields.facilityDetail}
                  </dd>
                </div>
              )}
              {fields.passStartsAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">이용 시작일</dt>
                  <dd className="font-medium">{fields.passStartsAt}</dd>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between gap-3 border-t border-gold/15 pt-2">
            <dt className="text-muted">결제 금액</dt>
            <dd className="font-bold tabular-nums">
              {formatCurrency(fields.amount)}
              {fields.listAmount > fields.amount && (
                <span className="ml-2 text-xs font-normal text-muted line-through">
                  {formatCurrency(fields.listAmount)}
                </span>
              )}
            </dd>
          </div>
          {fields.discountNote && (
            <div className="text-xs text-emerald-800">
              할인: {fields.discountNote}
            </div>
          )}
          {fields.contractNote && (
            <div className="text-xs text-muted">비고: {fields.contractNote}</div>
          )}
        </dl>
      </section>

      {termSections.map((section) => (
        <section key={section.id}>
          <h3 className="font-semibold">
            {section.title}
            {section.required && (
              <span className="ml-1 text-xs text-red-600">(필수)</span>
            )}
          </h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-charcoal/90">
            {section.paragraphs.map((paragraph, index) => (
              <li key={index}>{paragraph}</li>
            ))}
          </ol>
        </section>
      ))}

      {(signedAt || signatureUrl) && (
        <footer className="border-t border-gold/30 pt-4">
          {signedAt && (
            <p className="text-xs text-muted">
              전자 서명 일시: {formatSignedAt(signedAt)}
            </p>
          )}
          {signatureUrl && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted">회원 서명</p>
              <img
                src={signatureUrl}
                alt="회원 서명"
                className="mt-1 max-h-24 rounded-lg border border-gold/20 bg-white"
              />
            </div>
          )}
        </footer>
      )}
    </article>
  )
}
