import type { ContractType } from '../../constants/contractTerms'
import type { PaymentCategory } from '../../constants/paymentCategories'
import type { Member, PaymentRequest } from '../../types/database'

export type ContractFieldData = {
  centerName: string
  memberName: string
  memberPhone: string
  productLabel: string
  amount: number
  listAmount: number
  discountNote: string | null
  contractNote: string | null
  ptSessions: number | null
  trainerName: string | null
  passPeriod: string | null
  passStartsAt: string | null
  lockerPeriod: string | null
  towelPeriod: string | null
  facilityDetail: string | null
}

export function paymentCategoryToContractType(
  category: PaymentCategory,
): ContractType {
  return category === 'pt' ? 'pt_purchase' : 'center_pass_purchase'
}

function formatPeriodFromDays(days: number | null | undefined): string | null {
  if (!days || days < 1) return null
  if (days % 30 === 0) return `${days / 30}개월 (${days}일)`
  return `${days}일`
}

function formatStartsAt(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null
  return new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })
}

function inferLockerTowelPeriods(
  label: string,
  durationDays: number | null,
): { locker: string | null; towel: string | null; detail: string | null } {
  const period = formatPeriodFromDays(durationDays)
  const lower = label.toLowerCase()
  const hasLocker = label.includes('라커') || lower.includes('locker')
  const hasTowel = label.includes('수건') || lower.includes('towel')

  if (hasLocker && hasTowel) {
    return {
      locker: period,
      towel: period,
      detail: label,
    }
  }
  if (hasLocker) {
    return { locker: period, towel: '없음', detail: label }
  }
  if (hasTowel) {
    return { locker: '없음', towel: period, detail: label }
  }
  return {
    locker: '없음',
    towel: '없음',
    detail: period ? `${label} · ${period}` : label,
  }
}

export function buildContractFields(
  request: PaymentRequest,
  member: Pick<Member, 'name' | 'phone' | 'trainer_name'>,
  centerName: string,
): ContractFieldData {
  const category = request.category ?? 'pt'
  const base: ContractFieldData = {
    centerName: centerName.trim() || '센터',
    memberName: member.name,
    memberPhone: member.phone,
    productLabel: request.label,
    amount: Number(request.amount),
    listAmount: Number(request.list_amount),
    discountNote: request.discount_note,
    contractNote: request.note,
    ptSessions: null,
    trainerName: member.trainer_name,
    passPeriod: null,
    passStartsAt: formatStartsAt(request.starts_at),
    lockerPeriod: null,
    towelPeriod: null,
    facilityDetail: null,
  }

  if (category === 'pt') {
    return {
      ...base,
      ptSessions: request.sessions ?? null,
    }
  }

  if (category === 'center_pass') {
    return {
      ...base,
      passPeriod: formatPeriodFromDays(request.duration_days),
      lockerPeriod: '없음',
      towelPeriod: '없음',
    }
  }

  const lockerTowel = inferLockerTowelPeriods(
    request.label,
    request.duration_days,
  )
  return {
    ...base,
    passPeriod: '없음',
    lockerPeriod: lockerTowel.locker,
    towelPeriod: lockerTowel.towel,
    facilityDetail: lockerTowel.detail,
  }
}
