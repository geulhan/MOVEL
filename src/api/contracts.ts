import {
  CONTRACT_TERM_SECTIONS,
  type ContractStatus,
  type ContractType,
} from '../constants/contractTerms'
import {
  buildContractFields,
  paymentCategoryToContractType,
  type ContractFieldData,
} from '../lib/contracts/buildContractFields'
import { resolveCenterNameForMember } from '../lib/center'
import { supabase } from '../lib/supabase'
import type { Member, PaymentRequest } from '../types/database'
import { fetchMemberById } from './memberDetail'

export type ContractInstance = {
  id: string
  payment_request_id: string
  member_id: string
  contract_type: ContractType
  status: ContractStatus
  field_data: ContractFieldData
  terms_accepted: Record<string, boolean>
  signature_path: string | null
  signed_at: string | null
  created_at: string
  updated_at: string
}

export type ContractWithMember = ContractInstance & {
  member?: Pick<Member, 'id' | 'name' | 'phone'> | null
  payment_request?: Pick<
    PaymentRequest,
    'id' | 'label' | 'amount' | 'status' | 'category'
  > | null
}

function normalizeContract(row: ContractInstance): ContractInstance {
  return {
    ...row,
    field_data: row.field_data ?? ({} as ContractFieldData),
    terms_accepted: row.terms_accepted ?? {},
  }
}

export function getContractSignatureUrl(path: string | null): string | null {
  if (!path) return null
  const { data } = supabase.storage.from('contracts').getPublicUrl(path)
  return data.publicUrl
}

export async function fetchContractByPaymentRequestId(
  paymentRequestId: string,
): Promise<ContractInstance | null> {
  const { data, error } = await supabase
    .from('contract_instances')
    .select('*')
    .eq('payment_request_id', paymentRequestId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return normalizeContract(data as ContractInstance)
}

export async function fetchContractsByPaymentRequestIds(
  paymentRequestIds: string[],
): Promise<Map<string, ContractInstance>> {
  if (paymentRequestIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('contract_instances')
    .select('*')
    .in('payment_request_id', paymentRequestIds)

  if (error) throw error

  const map = new Map<string, ContractInstance>()
  for (const row of data ?? []) {
    const contract = normalizeContract(row as ContractInstance)
    map.set(contract.payment_request_id, contract)
  }
  return map
}

export async function createContractForPaymentRequest(
  request: PaymentRequest,
): Promise<ContractInstance> {
  const existing = await fetchContractByPaymentRequestId(request.id)
  if (existing) return existing

  const member = await fetchMemberById(request.member_id)
  if (!member) {
    throw new Error('회원 정보를 찾을 수 없습니다.')
  }

  const category = request.category ?? 'pt'
  const contractType = paymentCategoryToContractType(category)
  const centerName = await resolveCenterNameForMember(member)
  const fieldData = buildContractFields(request, member, centerName)

  const { data, error } = await supabase
    .from('contract_instances')
    .insert({
      payment_request_id: request.id,
      member_id: request.member_id,
      contract_type: contractType,
      status: 'pending_signature',
      field_data: fieldData,
      terms_accepted: {},
    })
    .select('*')
    .single()

  if (error) throw error
  return normalizeContract(data as ContractInstance)
}

export async function ensureContractsForPaymentRequests(
  requests: PaymentRequest[],
): Promise<Map<string, ContractInstance>> {
  const map = await fetchContractsByPaymentRequestIds(requests.map((r) => r.id))

  for (const request of requests) {
    if (!map.has(request.id)) {
      const created = await createContractForPaymentRequest(request)
      map.set(request.id, created)
    }
  }

  return map
}

export async function cancelContractForPaymentRequest(
  paymentRequestId: string,
): Promise<void> {
  const { error } = await supabase
    .from('contract_instances')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('payment_request_id', paymentRequestId)
    .neq('status', 'signed')

  if (error) throw error
}

export async function signContract(input: {
  contractId: string
  memberId: string
  termsAccepted: Record<string, boolean>
  signatureDataUrl: string
}): Promise<ContractInstance> {
  for (const section of CONTRACT_TERM_SECTIONS) {
    if (section.required && !input.termsAccepted[section.id]) {
      throw new Error(`「${section.title}」에 동의해 주세요.`)
    }
  }

  if (!input.signatureDataUrl.startsWith('data:image/')) {
    throw new Error('서명 이미지가 올바르지 않습니다.')
  }

  const { data: contract, error: fetchError } = await supabase
    .from('contract_instances')
    .select('*')
    .eq('id', input.contractId)
    .eq('member_id', input.memberId)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!contract) throw new Error('계약서를 찾을 수 없습니다.')
  if (contract.status === 'signed') {
    return normalizeContract(contract as ContractInstance)
  }
  if (contract.status !== 'pending_signature') {
    throw new Error('서명할 수 없는 계약서입니다.')
  }

  const blob = await dataUrlToBlob(input.signatureDataUrl)
  const path = `${input.memberId}/${input.contractId}.png`

  const { error: uploadError } = await supabase.storage
    .from('contracts')
    .upload(path, blob, {
      contentType: 'image/png',
      upsert: true,
    })

  if (uploadError) throw uploadError

  const now = new Date().toISOString()
  const { data: updated, error: updateError } = await supabase
    .from('contract_instances')
    .update({
      status: 'signed',
      terms_accepted: input.termsAccepted,
      signature_path: path,
      signed_at: now,
      updated_at: now,
    })
    .eq('id', input.contractId)
    .select('*')
    .single()

  if (updateError) throw updateError
  return normalizeContract(updated as ContractInstance)
}

export async function assertContractSignedForPayment(
  paymentRequestId: string,
): Promise<void> {
  const contract = await fetchContractByPaymentRequestId(paymentRequestId)
  if (!contract || contract.status !== 'signed') {
    throw new Error(
      '회원의 계약서 서명이 완료되지 않았습니다. 회원 앱에서 계약서에 서명한 뒤 결제 완료 처리해 주세요.',
    )
  }
}

export async function fetchContracts(options?: {
  status?: ContractStatus | 'all'
  limit?: number
}): Promise<ContractWithMember[]> {
  let query = supabase
    .from('contract_instances')
    .select('*')
    .order('created_at', { ascending: false })

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error) throw error

  const contracts = (data ?? []).map((row) =>
    normalizeContract(row as ContractInstance),
  )
  if (contracts.length === 0) return []

  const memberIds = [...new Set(contracts.map((c) => c.member_id))]
  const requestIds = contracts.map((c) => c.payment_request_id)

  const [{ data: members }, { data: requests }] = await Promise.all([
    supabase.from('members').select('id, name, phone').in('id', memberIds),
    supabase
      .from('payment_requests')
      .select('id, label, amount, status, category')
      .in('id', requestIds),
  ])

  const memberMap = new Map(
    (members ?? []).map((m) => [m.id, m as Pick<Member, 'id' | 'name' | 'phone'>]),
  )
  const requestMap = new Map(
    (requests ?? []).map((r) => [
      r.id,
      r as Pick<PaymentRequest, 'id' | 'label' | 'amount' | 'status' | 'category'>,
    ]),
  )

  return contracts.map((contract) => ({
    ...contract,
    member: memberMap.get(contract.member_id) ?? null,
    payment_request: requestMap.get(contract.payment_request_id) ?? null,
  }))
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  return response.blob()
}
