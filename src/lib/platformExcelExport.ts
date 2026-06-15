import * as XLSX from 'xlsx'
import type { SignupConsentRecord } from '../api/platformAccounts'
import { formatPhone } from '../api/members'

function localDateStamp(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export function exportSignupConsentsExcel(records: SignupConsentRecord[]): void {
  const rows = records.map((record) => ({
    가입일시: record.created_at
      ? new Date(record.created_at).toLocaleString('ko-KR')
      : '',
    유형: record.subject_type === 'center_admin' ? '센터 관리자' : '회원',
    센터명: record.center_name ?? '',
    센터코드: record.center_slug ?? '',
    이름: record.name ?? '',
    휴대전화: record.phone ? formatPhone(record.phone) : '',
    이메일: record.email ?? '',
    '만14세 이상': record.agree_age ? 'Y' : 'N',
    이용약관: record.agree_terms ? 'Y' : 'N',
    개인정보: record.agree_privacy ? 'Y' : 'N',
    '마케팅 수신': record.agree_marketing ? 'Y' : 'N',
  }))

  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, '가입동의')
  XLSX.writeFile(workbook, `MotionHub_가입동의_${localDateStamp()}.xlsx`)
}
