import * as XLSX from 'xlsx'
import type { MemberStatus } from '../types/database'

export type ImportFieldKey =
  | 'name'
  | 'phone'
  | 'total_sessions'
  | 'remaining_sessions'
  | 'payment_amount'
  | 'registered_at'
  | 'trainer_name'
  | 'status'
  | 'expires_at'

export const IMPORT_FIELD_LABELS: Record<ImportFieldKey, string> = {
  name: '이름',
  phone: '연락처',
  total_sessions: '총 PT 횟수',
  remaining_sessions: '잔여 PT',
  payment_amount: '결제 금액',
  registered_at: '등록일',
  trainer_name: '트레이너',
  status: '상태',
  expires_at: '만료일',
}

export type CrmPresetId = 'motionhub' | 'broj' | 'bodycodi' | 'custom'

export const CRM_PRESET_LABELS: Record<CrmPresetId, string> = {
  motionhub: 'MotionHub 양식',
  broj: '브로제이',
  bodycodi: '바디코디',
  custom: '직접 매핑',
}

const HEADER_ALIASES: Record<ImportFieldKey, string[]> = {
  name: ['이름', '회원명', '고객명', '성명', 'name', '회원 이름'],
  phone: [
    '연락처',
    '휴대폰',
    '휴대전화',
    '전화번호',
    '핸드폰',
    'phone',
    'mobile',
    '연락처번호',
  ],
  total_sessions: [
    '총 pt',
    '총pt',
    '총 횟수',
    '등록횟수',
    '등록 횟수',
    '총 PT',
    'PT횟수',
    'pt횟수',
    '총회차',
    'total_sessions',
  ],
  remaining_sessions: [
    '잔여',
    '잔여 pt',
    '잔여pt',
    '남은횟수',
    '남은 횟수',
    '잔여 PT',
    '잔여회차',
    'remaining',
    'remaining_sessions',
  ],
  payment_amount: [
    '결제금액',
    '결제 금액',
    '금액',
    '매출',
    'payment',
    'payment_amount',
    '수강료',
  ],
  registered_at: [
    '등록일',
    '가입일',
    '등록 일자',
    '등록날짜',
    'registered_at',
    'start_date',
    '시작일',
  ],
  trainer_name: ['트레이너', '담당', '담당트레이너', '강사', 'trainer', 'trainer_name'],
  status: ['상태', '회원상태', 'status'],
  expires_at: ['만료일', '종료일', 'expires_at', 'end_date'],
}

const PRESET_OVERRIDES: Partial<
  Record<CrmPresetId, Partial<Record<ImportFieldKey, string[]>>>
> = {
  broj: {
    name: ['회원명', '이름'],
    phone: ['휴대폰', '연락처'],
    total_sessions: ['등록횟수', '총횟수'],
    remaining_sessions: ['잔여횟수', '잔여'],
    payment_amount: ['결제금액', '판매금액'],
    registered_at: ['등록일', '최초등록일'],
    trainer_name: ['담당트레이너', '트레이너'],
  },
  bodycodi: {
    name: ['회원명', '이름'],
    phone: ['휴대전화', '연락처'],
    total_sessions: ['총횟수', 'PT횟수'],
    remaining_sessions: ['잔여횟수', '남은횟수'],
    payment_amount: ['결제금액', '금액'],
    registered_at: ['등록일', '가입일'],
    trainer_name: ['담당강사', '트레이너'],
  },
}

export type ParsedSheet = {
  headers: string[]
  rows: Record<string, string>[]
}

export type ColumnMapping = Partial<Record<ImportFieldKey, string>>

export type ImportMemberDraft = {
  rowIndex: number
  name: string
  phone: string
  total_sessions: number
  remaining_sessions: number
  payment_amount: number
  registered_at: string
  trainer_name: string | null
  status: MemberStatus
  expires_at: string | null
  errors: string[]
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

function cellToString(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(value).trim()
}

export async function parseExcelFile(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { headers: [], rows: [] }
  }

  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })

  const headerRow = (matrix[0] ?? []).map((cell) => cellToString(cell))
  const headers = headerRow.map((header, index) => header || `열${index + 1}`)

  const rows = matrix.slice(1).map((line) => {
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = cellToString(line[index])
    })
    return record
  })

  return {
    headers,
    rows: rows.filter((row) =>
      Object.values(row).some((value) => value.trim().length > 0),
    ),
  }
}

function matchHeader(
  headers: string[],
  aliases: string[],
): string | undefined {
  const normalizedHeaders = headers.map((header) => ({
    header,
    key: normalizeHeader(header),
  }))

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias)
    const exact = normalizedHeaders.find((item) => item.key === normalizedAlias)
    if (exact) return exact.header
  }

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias)
    const partial = normalizedHeaders.find(
      (item) =>
        item.key.includes(normalizedAlias) || normalizedAlias.includes(item.key),
    )
    if (partial) return partial.header
  }

  return undefined
}

export function suggestColumnMapping(
  headers: string[],
  preset: CrmPresetId = 'custom',
): ColumnMapping {
  const mapping: ColumnMapping = {}

  for (const field of Object.keys(IMPORT_FIELD_LABELS) as ImportFieldKey[]) {
    const presetAliases = PRESET_OVERRIDES[preset]?.[field]
    const aliases = presetAliases ?? HEADER_ALIASES[field]
    const matched = matchHeader(headers, aliases)
    if (matched) {
      mapping[field] = matched
    }
  }

  return mapping
}

function parsePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('010')) return digits
  if (digits.length === 10 && digits.startsWith('10')) return `0${digits}`
  return null
}

function parseNumber(raw: string, fallback = 0): number {
  const cleaned = raw.replace(/[^\d.-]/g, '')
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : fallback
}

function parseDate(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const iso = trimmed.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/)
  if (iso) {
    const mm = String(iso[2]).padStart(2, '0')
    const dd = String(iso[3]).padStart(2, '0')
    return `${iso[1]}-${mm}-${dd}`
  }

  const compact = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (compact) {
    return `${compact[1]}-${compact[2]}-${compact[3]}`
  }

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const m = String(parsed.getMonth() + 1).padStart(2, '0')
    const d = String(parsed.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  return null
}

function parseStatus(raw: string): MemberStatus {
  const value = raw.trim().toLowerCase()
  if (!value) return 'active'
  if (['종료', '해지', 'terminated', '탈퇴'].some((token) => value.includes(token))) {
    return 'terminated'
  }
  if (['휴면', 'dormant'].some((token) => value.includes(token))) {
    return 'dormant'
  }
  return 'active'
}

function readMappedValue(
  row: Record<string, string>,
  mapping: ColumnMapping,
  field: ImportFieldKey,
): string {
  const header = mapping[field]
  if (!header) return ''
  return row[header] ?? ''
}

export function mapRowsToImportDrafts(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): ImportMemberDraft[] {
  return rows.map((row, index) => {
    const errors: string[] = []
    const name = readMappedValue(row, mapping, 'name').trim()
    const phoneRaw = readMappedValue(row, mapping, 'phone')
    const phone = parsePhone(phoneRaw)

    const totalSessions = Math.max(
      0,
      Math.round(parseNumber(readMappedValue(row, mapping, 'total_sessions'), 0)),
    )
    const remainingRaw = readMappedValue(row, mapping, 'remaining_sessions')
    const remainingSessions = remainingRaw.trim()
      ? Math.max(0, Math.round(parseNumber(remainingRaw, 0)))
      : totalSessions

    const paymentAmount = Math.max(
      0,
      Math.round(parseNumber(readMappedValue(row, mapping, 'payment_amount'), 0)),
    )

    const registeredAt =
      parseDate(readMappedValue(row, mapping, 'registered_at')) ??
      new Date().toISOString().slice(0, 10)

    const trainerName =
      readMappedValue(row, mapping, 'trainer_name').trim() || null
    const status = parseStatus(readMappedValue(row, mapping, 'status'))
    const expiresAt = parseDate(readMappedValue(row, mapping, 'expires_at'))

    if (!name) errors.push('이름 없음')
    if (!phone) errors.push('연락처 형식 오류')

    if (totalSessions > 0 && remainingSessions > totalSessions) {
      errors.push('잔여 횟수가 총 횟수보다 큼')
    }

    return {
      rowIndex: index + 2,
      name,
      phone: phone ?? '',
      total_sessions: totalSessions || remainingSessions || 0,
      remaining_sessions: remainingSessions,
      payment_amount: paymentAmount,
      registered_at: registeredAt,
      trainer_name: trainerName,
      status,
      expires_at: expiresAt,
      errors,
    }
  })
}

export function exportImportTemplateExcel(): void {
  const rows = [
    {
      이름: '홍길동',
      연락처: '01012345678',
      '총 PT': 20,
      '잔여 PT': 15,
      결제금액: 1000000,
      등록일: '2026-01-15',
      트레이너: '김트레이너',
      상태: '활성',
      만료일: '2026-07-15',
    },
  ]

  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, '회원양식')
  XLSX.writeFile(workbook, 'MotionHub_회원_가져오기_양식.xlsx')
}
