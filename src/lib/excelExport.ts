import * as XLSX from 'xlsx'
import type { ExerciseJournal } from '../api/exerciseJournals'
import { formatDate, formatPhone } from '../api/members'
import type { Member } from '../types/database'
import { MEMBER_STATUS_LABELS } from '../types/database'

const CREATED_BY_LABELS: Record<ExerciseJournal['created_by'], string> = {
  member: '회원',
  trainer: '트레이너',
  admin: '관리자',
}

function localDateStamp(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function safeFilenamePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '_').trim() || 'export'
}

function downloadWorkbook(workbook: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(workbook, filename)
}

export function exportMembersExcel(members: Member[]): void {
  const rows = members.map((member) => ({
    이름: member.name,
    연락처: formatPhone(member.phone),
    트레이너: member.trainer_name ?? '',
    '총 PT': member.total_sessions,
    '잔여 PT': member.remaining_sessions,
    결제금액: member.payment_amount,
    등록일: formatDate(member.registered_at),
    만료일: formatDate(member.expires_at),
    상태: MEMBER_STATUS_LABELS[member.status],
  }))

  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, '회원목록')
  downloadWorkbook(workbook, `회원목록_${localDateStamp()}.xlsx`)
}

export function exportExerciseJournalsExcel(
  journals: ExerciseJournal[],
  memberName: string,
): void {
  const rows = journals.map((journal) => ({
    회원명: memberName,
    운동일: formatDate(journal.trained_at),
    제목: journal.title ?? '',
    내용: journal.content,
    작성자: CREATED_BY_LABELS[journal.created_by],
    '사진 URL': journal.image_urls.join('\n'),
    등록일시: journal.created_at.slice(0, 16).replace('T', ' '),
  }))

  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, '운동일지')
  const namePart = safeFilenamePart(memberName)
  downloadWorkbook(workbook, `운동일지_${namePart}_${localDateStamp()}.xlsx`)
}
