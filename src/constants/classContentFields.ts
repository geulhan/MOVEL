export type ClassContentFieldDef = {
  key: string
  label: string
  placeholder?: string
  multiline?: boolean
}

/** 그룹수업 수업 내용·운영 정리 항목 (센터 공통 기본) */
export const DEFAULT_CLASS_CONTENT_FIELDS: ClassContentFieldDef[] = [
  {
    key: 'summary',
    label: '수업 요약',
    multiline: true,
    placeholder: '회원에게 보여줄 한 줄 소개',
  },
  {
    key: 'level',
    label: '난이도',
    placeholder: '예: 초급, 중급, 고급',
  },
  {
    key: 'target',
    label: '추천 대상',
    placeholder: '예: 자세 교정이 필요한 분',
  },
  {
    key: 'equipment',
    label: '준비물',
    placeholder: '예: 매트, 수건',
  },
  {
    key: 'focus',
    label: '집중 부위',
    placeholder: '예: 코어, 하체, 전신',
  },
  {
    key: 'notes',
    label: '운영 메모',
    multiline: true,
    placeholder: '센터 내부 참고 (회원에게 미표시)',
  },
]

export type ClassContentFields = Record<string, string>

export function normalizeClassContentFields(
  raw: ClassContentFields | null | undefined,
): ClassContentFields {
  if (!raw || typeof raw !== 'object') return {}
  const result: ClassContentFields = {}
  for (const [key, value] of Object.entries(raw)) {
    const trimmed = String(value ?? '').trim()
    if (trimmed) result[key] = trimmed
  }
  return result
}

export function classContentPreview(
  fields: ClassContentFields | null | undefined,
): string | null {
  const normalized = normalizeClassContentFields(fields)
  return normalized.summary ?? normalized.target ?? normalized.level ?? null
}
