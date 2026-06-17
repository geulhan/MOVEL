export const CONSULTATION_CONTENT_FIELDS = [
  { key: 'visit_purpose', label: '방문 목적', rows: 2 },
  { key: 'occupation_work_pattern', label: '직업 / 업무패턴', rows: 2 },
  { key: 'sitting_activity_time', label: '앉은시간 / 활동시간', rows: 2 },
  { key: 'current_discomfort', label: '현재 불편 부위', rows: 2 },
  { key: 'injury_treatment_history', label: '과거 부상 · 치료 이력', rows: 3 },
  { key: 'sleep_diet', label: '수면 / 식사', rows: 2 },
  { key: 'exercise_experience', label: '운동 경험 / 중단 이유', rows: 2 },
  { key: 'posture_assessment', label: '자세평가', rows: 3 },
  { key: 'movement_assessment', label: '움직임평가', rows: 3 },
] as const

export type ConsultationContentFieldKey =
  (typeof CONSULTATION_CONTENT_FIELDS)[number]['key']

export const LEGACY_CONSULTATION_FIELDS = [
  { key: 'pain_status', label: '통증 상태 (이전)' },
  { key: 'exercise_progress', label: '운동 진행상황 (이전)' },
  { key: 'goals', label: '목표 (이전)' },
  { key: 'special_notes', label: '특이사항 (이전)' },
] as const

export type LegacyConsultationFieldKey =
  (typeof LEGACY_CONSULTATION_FIELDS)[number]['key']

export function emptyConsultationContentFields(): Record<
  ConsultationContentFieldKey,
  string
> {
  return Object.fromEntries(
    CONSULTATION_CONTENT_FIELDS.map((field) => [field.key, '']),
  ) as Record<ConsultationContentFieldKey, string>
}
