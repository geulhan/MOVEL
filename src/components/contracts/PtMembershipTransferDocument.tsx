import { formatCurrency } from '../../api/members'
import {
  applyCenterNameToTransferTerms,
  CONTRACT_TEMPLATE_LABELS,
} from '../../constants/contractTerms'
import type { PtMembershipTransferFieldData } from '../../lib/contracts/contractSampleData'

type Props = {
  fields: PtMembershipTransferFieldData
  centerName?: string
  draft?: boolean
  compact?: boolean
}

export function PtMembershipTransferDocument({
  fields,
  centerName,
  draft = false,
  compact = false,
}: Props) {
  const sectionClass = compact ? 'space-y-3 text-xs' : 'space-y-4 text-sm'
  const displayCenterName =
    centerName?.trim() || fields.centerName.trim() || '센터'
  const termSections = applyCenterNameToTransferTerms(displayCenterName)

  return (
    <article className={`${sectionClass} text-charcoal`}>
      {draft && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          계약서 초안 — 실제 양도·양수 시 회원 정보와 잔여 회차를 기입해 사용합니다.
        </p>
      )}

      <header className="border-b border-gold/30 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
          {displayCenterName}
        </p>
        <h2 className="mt-1 text-xl font-bold">
          {CONTRACT_TEMPLATE_LABELS.pt_membership_transfer}
        </h2>
        <p className="mt-2 text-muted">
          계약 당사자: {displayCenterName}(센터) · 양도인 {fields.transferorName}(
          {fields.transferorPhone}) · 양수인 {fields.transfereeName}(
          {fields.transfereePhone})
        </p>
      </header>

      <section>
        <h3 className="font-semibold">양도·양수 내역</h3>
        <dl className="mt-2 grid gap-2 rounded-xl border border-gold/20 bg-cream/40 p-4">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">대상 상품</dt>
            <dd className="font-medium text-right">{fields.productLabel}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">최초 구매 회차</dt>
            <dd className="font-medium tabular-nums">{fields.originalSessions}회</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">양도 잔여 회차</dt>
            <dd className="font-bold tabular-nums text-charcoal">
              {fields.remainingSessions}회
            </dd>
          </div>
          {fields.trainerName && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">담당 트레이너</dt>
              <dd className="font-medium">{fields.trainerName}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-muted">양도 수수료(센터)</dt>
            <dd className="font-medium tabular-nums">
              {formatCurrency(fields.transferFee)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-gold/15 pt-2">
            <dt className="text-muted">양도 예정일</dt>
            <dd className="font-medium">{fields.transferDate}</dd>
          </div>
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

      <footer className="border-t border-gold/30 pt-4">
        <p className="text-xs font-medium text-muted">서명</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {[
            { role: '양도인', name: fields.transferorName },
            { role: '양수인', name: fields.transfereeName },
            { role: '센터 확인', name: displayCenterName },
          ].map((party) => (
            <div
              key={party.role}
              className="rounded-lg border border-dashed border-gold/30 bg-white px-3 py-4"
            >
              <p className="text-xs font-semibold text-charcoal">{party.role}</p>
              <p className="mt-1 text-xs text-muted">{party.name}</p>
              <div className="mt-6 h-12 border-b border-charcoal/20" />
              <p className="mt-1 text-[10px] text-muted">서명 / 날짜</p>
            </div>
          ))}
        </div>
      </footer>
    </article>
  )
}
