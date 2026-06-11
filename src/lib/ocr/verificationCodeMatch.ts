const CODE_PATTERNS = [
  /MOVEL[-\s]?(\d{4})/gi,
  /M[O0][VW][E3]?[L1I1][-\s]?(\d{4})/gi,
  /MOV\s*EL[-\s]?(\d{4})/gi,
  /M\s*O\s*V\s*E\s*L[-\s]?(\d{4})/gi,
  /모벨[-\s]?(\d{4})/gi,
]

export function normalizeVerificationCode(code: string): string {
  const compact = code.toUpperCase().replace(/\s/g, '')
  const m = compact.match(/MOVEL-?(\d{4})/) ?? compact.match(/(\d{4})$/)
  return m ? `MOVEL-${m[1]}` : compact
}

export function extractVerificationCodesFromText(rawText: string): string[] {
  const found = new Set<string>()
  const variants = [rawText, rawText.replace(/\s+/g, ' '), rawText.replace(/\s/g, '')]

  for (const text of variants) {
    for (const pattern of CODE_PATTERNS) {
      pattern.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = pattern.exec(text)) !== null) {
        found.add(`MOVEL-${match[1]}`)
      }
    }
  }

  return [...found]
}

function digitsVisibleWithMovelContext(rawText: string, digits: string): boolean {
  const upper = rawText.toUpperCase()
  let index = upper.indexOf(digits)
  while (index !== -1) {
    const context = upper.slice(Math.max(0, index - 24), index + digits.length + 8)
    if (/MOV|MOBEL|MOVEL|모벨/.test(context)) {
      return true
    }
    index = upper.indexOf(digits, index + 1)
  }
  return false
}

/** OCR 결과·원문에서 오늘 인증코드가 보이는지 판별 (분할 화면·오인식 허용) */
export function verificationCodeMatchesCapture(
  expectedCode: string,
  extractedCode: string | null,
  rawText: string,
): boolean {
  const expected = normalizeVerificationCode(expectedCode)
  const expectedDigits = expected.match(/(\d{4})$/)?.[1]
  if (!expectedDigits) return false

  if (extractedCode && normalizeVerificationCode(extractedCode) === expected) {
    return true
  }

  for (const candidate of extractVerificationCodesFromText(rawText)) {
    if (normalizeVerificationCode(candidate) === expected) {
      return true
    }
  }

  if (digitsVisibleWithMovelContext(rawText, expectedDigits)) {
    return true
  }

  const compactText = rawText.toUpperCase().replace(/\s/g, '')
  if (compactText.includes(expected.replace('-', ''))) {
    return true
  }

  return false
}
