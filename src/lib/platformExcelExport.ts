import * as XLSX from 'xlsx'
import type { SignupConsentRecord } from '../api/platformAccounts'
import type { PlatformCenter } from '../api/platformCenters'
import { formatPhone } from '../api/members'
import {
  formatServicePeriod,
  getServicePeriodStatus,
  SERVICE_PERIOD_STATUS_LABELS,
} from '../types/centerServicePeriod'

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

export function exportPlatformCentersExcel(centers: PlatformCenter[]): void {
  const rows = centers.map((center) => {
    const periodStatus = getServicePeriodStatus(center.status, center.servicePeriod)
    return {
      센터명: center.name,
      센터코드: center.slug,
      상태: center.status,
      플랜: center.plan_code ?? '',
      연락이메일: center.contactEmail ?? '',
      연락처: center.contactPhone ? formatPhone(center.contactPhone) : '',
      회원수: center.member_count,
      트레이너수: center.trainer_count,
      이용시작일: center.servicePeriod.startsAt ?? '',
      이용종료일: center.servicePeriod.endsAt ?? '',
      이용상태: SERVICE_PERIOD_STATUS_LABELS[periodStatus],
      이용기간: formatServicePeriod(center.servicePeriod),
      베타체험: center.betaTrial ? 'Y' : 'N',
      생성일: center.created_at
        ? new Date(center.created_at).toLocaleString('ko-KR')
        : '',
    }
  })

  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, '센터목록')
  XLSX.writeFile(workbook, `MotionHub_센터목록_${localDateStamp()}.xlsx`)
}
