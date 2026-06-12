export type CenterPassStatus = 'scheduled' | 'active' | 'expired' | 'cancelled'

export const CENTER_PASS_STATUS_LABELS: Record<CenterPassStatus, string> = {
  scheduled: '시작 예정',
  active: '이용 중',
  expired: '만료',
  cancelled: '취소',
}
