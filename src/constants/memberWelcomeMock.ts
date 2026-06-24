/** 회원 welcome 미리보기용 샘플 데이터 (실제 DB와 무관) */

export type MemberWelcomeMockPass = {
  label: string
  remaining: number
  total: number
}

export type MemberWelcomeMockAttendance = {
  dateLabel: string
  type: string
}

export type MemberWelcomeMockJournal = {
  dateLabel: string
  title: string
  excerpt: string
}

export type MemberWelcomeMockData = {
  nextSchedule: {
    title: string
    dateTimeLabel: string
    trainerName: string
  }
  passes: MemberWelcomeMockPass[]
  recentAttendance: MemberWelcomeMockAttendance[]
  journal: MemberWelcomeMockJournal
}

export const MEMBER_WELCOME_MOCK: MemberWelcomeMockData = {
  nextSchedule: {
    title: 'PT 개인레슨',
    dateTimeLabel: '6월 24일 (화) 12:00',
    trainerName: '김재한',
  },
  passes: [
    { label: 'PT', remaining: 12, total: 20 },
    { label: '필라테스', remaining: 8, total: 10 },
  ],
  recentAttendance: [
    { dateLabel: '6월 20일 (금) 18:30', type: 'PT' },
    { dateLabel: '6월 18일 (수) 12:00', type: 'PT' },
  ],
  journal: {
    dateLabel: '6월 20일',
    title: '가슴·삼두',
    excerpt: '벤치프레스 50kg 3×10, 케이블 푸시다운 15kg…',
  },
}
