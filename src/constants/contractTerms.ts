/** MOVEL 기본 계약 약관 (센터별 커스터마이즈 전까지 공통 사용) */

export type ContractTermSection = {
  id: string
  title: string
  required: boolean
  paragraphs: string[]
}

export const CONTRACT_TERM_SECTIONS: ContractTermSection[] = [
  {
    id: 'center_use',
    title: '센터 이용 약관',
    required: true,
    paragraphs: [
      '본 약관은 {{centerName}}(이하 "센터")와 회원 간의 시설 이용 및 서비스 제공에 관한 기본 사항을 정합니다.',
      '회원은 센터의 운영 규정, 안전 수칙, 이용 시간 및 시설 사용 방법을 준수해야 하며, 타 회원 또는 직원에게 피해를 주는 행위를 해서는 안 됩니다.',
      '회원은 본인의 건강 상태를 고지하고, 의사의 운동 제한 권고가 있는 경우 사전에 센터에 알려야 합니다. 운동 중 발생할 수 있는 위험에 대해 회원은 스스로 주의를 기울여야 합니다.',
      '센터는 시설 점검, 천재지변, 행정 명령 등 불가피한 사유로 일시적으로 운영을 중단할 수 있으며, 이 경우 회원에게 사전 또는 사후 안내합니다.',
      '회원은 타인에게 회원권·이용권을 대여하거나 양도할 수 없으며, 부정 이용이 확인될 경우 이용이 제한될 수 있습니다.',
      'PT 수업은 사전 예약을 원칙으로 하며, 무단 결석 또는 반복적인 지각은 수업 제공에 제한이 있을 수 있습니다.',
      '센터 내 촬영, 녹음, 광고 목적의 촬영은 센터 승인 없이 금지됩니다.',
    ],
  },
  {
    id: 'refund',
    title: '환불 약관',
    required: true,
    paragraphs: [
      '본 환불 약관은 전자상거래 등에서의 소비자보호에 관한 법률 및 관련 지침을 준수합니다.',
      '회원이 결제한 상품·서비스에 대해 환불을 요청하는 경우, 미사용 잔여분에 대해 환불이 가능합니다. 이미 제공·이용된 회차·기간에 해당하는 금액은 환불 대상에서 제외됩니다.',
      'PT 회원권 환불: 총 결제 금액에서 (1) 이미 진행된 PT 횟수에 해당하는 금액, (2) 위약금(총 결제 금액의 10%), (3) 기타 실비(카드 수수료 등)를 공제한 금액을 환불합니다. 1회당 단가는 총 결제 금액을 총 횟수로 나눈 금액을 기준으로 합니다.',
      '센터 이용권·라커·수건 등 기간형 상품 환불: 이용 개시 전 전액 환불이 가능합니다. 이용 개시 후에는 (1) 이용 일수에 해당하는 금액, (2) 위약금(잔여 금액의 10%, 단 최대 10만 원)을 공제한 잔액을 환불합니다. 1일 단가는 총 결제 금액을 총 이용 일수로 나눈 금액을 기준으로 합니다.',
      '할인·프로모션·패키지 결합 상품은 환불 시 실제 납부 금액과 적용된 할인 조건을 기준으로 산정하며, 무상 제공된 혜택이 있는 경우 해당 혜택 상당액이 공제될 수 있습니다.',
      '환불 신청은 센터 운영 시간 내 대면·전화·앱 문의를 통해 접수하며, 회원 본인 확인 후 처리합니다.',
      '환불 금액 확정 후 영업일 기준 7일 이내에 회원이 지정한 방법(계좌 이체 등)으로 환불합니다. 카드 결제 취소의 경우 카드사 정책에 따라 시일이 소요될 수 있습니다.',
      '회원의 귀책 사유(약관 위반, 부정 이용, 타인 명의 사용 등)로 이용 계약이 해지되는 경우 환불이 제한될 수 있습니다.',
      '천재지변, 감염병 확산, 정부 명령 등 센터 운영이 불가능한 기간에 대해서는 센터와 회원이 협의하여 이용 기간 연장 또는 잔여 기간 비례 환불 등 합리적인 방법으로 조정합니다.',
    ],
  },
  {
    id: 'privacy',
    title: '개인정보 수집·이용 동의',
    required: true,
    paragraphs: [
      '센터는 회원 관리, 계약 이행, 결제·환불 처리, PT 및 시설 이용 안내, 고객 상담 목적으로 이름, 연락처, 결제·이용 내역, 건강·운동 관련 회원이 제공한 정보를 수집·이용합니다.',
      '수집된 개인정보는 관련 법령이 정한 기간 또는 이용 목적 달성 시까지 보관하며, 목적 외 이용·제3자 제공은 회원 동의 또는 법령에 따른 경우를 제외하고 하지 않습니다.',
      '회원은 개인정보 열람·정정·삭제·처리 정지를 요청할 수 있으며, 센터는 지체 없이 조치합니다. 다만, 계약 이행에 필수적인 정보 삭제 시 서비스 이용이 제한될 수 있습니다.',
      '본 동의는 거부할 수 있으나, 거부 시 회원 가입·이용 계약 체결이 불가능할 수 있습니다.',
    ],
  },
]

export const CONTRACT_TYPE_LABELS = {
  pt_purchase: 'PT 구매계약서',
  center_pass_purchase: '센터이용권 구매계약서',
} as const

export type ContractType = keyof typeof CONTRACT_TYPE_LABELS

/** 결제 연동 계약서 + 양도·양수 등 별도 양식 초안 */
export const CONTRACT_TEMPLATE_LABELS = {
  ...CONTRACT_TYPE_LABELS,
  pt_membership_transfer: 'PT 회원권 양도·양수 계약서',
} as const

export type ContractTemplateKey = keyof typeof CONTRACT_TEMPLATE_LABELS

export type ContractTemplateMeta = {
  key: ContractTemplateKey
  label: string
  description: string
  usage: string
  category: 'purchase' | 'transfer'
  linkedToPayment: boolean
}

export const CONTRACT_TEMPLATES: ContractTemplateMeta[] = [
  {
    key: 'pt_purchase',
    label: CONTRACT_TEMPLATE_LABELS.pt_purchase,
    description: 'PT 회차 구매 시 회원 앱에서 서명하는 구매 계약서입니다.',
    usage: '결제 요청(PT) 생성 시 자동 발급 · 결제 전 서명 필수',
    category: 'purchase',
    linkedToPayment: true,
  },
  {
    key: 'center_pass_purchase',
    label: CONTRACT_TEMPLATE_LABELS.center_pass_purchase,
    description:
      '센터 이용권·라커·수건 등 기간형 상품 구매 시 사용하는 계약서입니다.',
    usage: '결제 요청(센터이용권·부가서비스) 생성 시 자동 발급 · 결제 전 서명 필수',
    category: 'purchase',
    linkedToPayment: true,
  },
  {
    key: 'pt_membership_transfer',
    label: CONTRACT_TEMPLATE_LABELS.pt_membership_transfer,
    description:
      'PT 잔여 회차를 타 회원에게 양도·양수할 때 센터 승인 하에 체결하는 계약서 초안입니다.',
    usage: '대면 작성 · 양도인·양수인·센터 확인 후 보관 (앱 연동 예정)',
    category: 'transfer',
    linkedToPayment: false,
  },
]

export const PT_MEMBERSHIP_TRANSFER_SECTIONS: ContractTermSection[] = [
  {
    id: 'transfer_terms',
    title: '양도·양수 약관',
    required: true,
    paragraphs: [
      '양도인은 본인 명의의 PT 회원권에 대한 잔여 이용 권리를 양수인에게 양도하고, 양수인은 이를 양수함에 동의합니다.',
      '본 양도·양수는 {{centerName}}(이하 "센터")의 사전 승인 및 본 계약서 서명이 완료된 경우에만 유효합니다. 센터는 양도인·양수인의 본인 확인, 잔여 회차, 미납·환불·분쟁 여부 등을 확인한 뒤 처리합니다.',
      '양도 대상은 미사용 잔여 PT 회차에 한하며, 이미 사용·예약·소멸된 회차는 양도할 수 없습니다. 양도 후 담당 트레이너·수업 일정은 센터 운영 정책과 협의 가능 일정에 따라 재배정될 수 있습니다.',
      '양도 수수료 및 양도 대금(양수인이 양도인에게 지급하는 금액)은 당사자 간 자유롭게 정할 수 있으며, 센터에 납부하는 양도 수수료는 별도 안내에 따릅니다. 센터는 당사자 간 대금 분쟁에 개입하지 않습니다.',
      '양도·양수 완료 후 회원 정보·잔여 회차·담당 트레이너 등은 센터 시스템에 반영되며, 양도인은 잔여 PT 이용 권리를 상실하고 양수인에게 귀속됩니다.',
      '허위·대리·명의 대여 등 부정 양도가 확인되거나 센터 이용 약관을 위반하는 경우 센터는 양도를 취소하거나 이용을 제한할 수 있습니다.',
      '양도·양수와 관련하여 환불·위약금 등은 최초 PT 구매 계약서 및 센터 환불 약관을 우선 적용하며, 별도 합의가 없는 한 양도만으로 환불 의무가 새로 발생하지 않습니다.',
    ],
  },
  {
    id: 'privacy',
    title: '개인정보 수집·이용 동의',
    required: true,
    paragraphs: [
      '센터는 양도·양수 계약 이행, 회원 관리, PT 이용 안내 및 고객 상담 목적으로 양도인·양수인의 이름, 연락처, 결제·이용 내역을 수집·이용합니다.',
      '수집된 개인정보는 관련 법령이 정한 기간 또는 이용 목적 달성 시까지 보관하며, 목적 외 이용·제3자 제공은 당사자 동의 또는 법령에 따른 경우를 제외하고 하지 않습니다.',
      '당사자는 개인정보 열람·정정·삭제·처리 정지를 요청할 수 있으며, 센터는 지체 없이 조치합니다.',
    ],
  },
]

export const CONTRACT_STATUS_LABELS = {
  pending_signature: '서명 대기',
  signed: '서명 완료',
  cancelled: '취소',
} as const

export type ContractStatus = keyof typeof CONTRACT_STATUS_LABELS

export function applyCenterNameToContractTerms(
  centerName: string,
  sections: ContractTermSection[] = CONTRACT_TERM_SECTIONS,
): ContractTermSection[] {
  const name = centerName.trim() || '센터'
  return sections.map((section) => ({
    ...section,
    paragraphs: section.paragraphs.map((paragraph) =>
      paragraph.replaceAll('{{centerName}}', name),
    ),
  }))
}

export function applyCenterNameToTransferTerms(
  centerName: string,
): ContractTermSection[] {
  return applyCenterNameToContractTerms(
    centerName,
    PT_MEMBERSHIP_TRANSFER_SECTIONS,
  )
}
