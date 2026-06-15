import type { ContractFieldData } from './buildContractFields'

export type PtMembershipTransferFieldData = {
  centerName: string
  transferorName: string
  transferorPhone: string
  transfereeName: string
  transfereePhone: string
  productLabel: string
  originalSessions: number
  remainingSessions: number
  transferFee: number
  transferDate: string
  trainerName: string | null
  contractNote: string | null
}

export function buildSamplePurchaseFields(
  centerName: string,
  contractType: 'pt_purchase' | 'center_pass_purchase',
): ContractFieldData {
  if (contractType === 'pt_purchase') {
    return {
      centerName,
      memberName: '홍길동',
      memberPhone: '01012345678',
      productLabel: 'PT 30회',
      amount: 2_100_000,
      listAmount: 2_100_000,
      discountNote: null,
      contractNote: '초안 미리보기용 예시 데이터입니다.',
      ptSessions: 30,
      trainerName: '김트레이너',
      passPeriod: null,
      passStartsAt: null,
      lockerPeriod: null,
      towelPeriod: null,
      facilityDetail: null,
    }
  }

  return {
    centerName,
    memberName: '홍길동',
    memberPhone: '01012345678',
    productLabel: '센터 이용권 3개월 + 라커',
    amount: 450_000,
    listAmount: 500_000,
    discountNote: '신규 회원 10% 할인',
    contractNote: '초안 미리보기용 예시 데이터입니다.',
    ptSessions: null,
    trainerName: null,
    passPeriod: '3개월 (90일)',
    passStartsAt: '2026. 6. 12.',
    lockerPeriod: '3개월 (90일)',
    towelPeriod: '없음',
    facilityDetail: null,
  }
}

export function buildSampleTransferFields(
  centerName: string,
): PtMembershipTransferFieldData {
  return {
    centerName,
    transferorName: '홍길동',
    transferorPhone: '01012345678',
    transfereeName: '김양수',
    transfereePhone: '01087654321',
    productLabel: 'PT 30회 회원권',
    originalSessions: 30,
    remainingSessions: 18,
    transferFee: 50_000,
    transferDate: new Date().toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul',
    }),
    trainerName: '김트레이너',
    contractNote: '초안 미리보기용 예시 데이터입니다.',
  }
}
