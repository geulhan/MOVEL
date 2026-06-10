const PHONE_BODY_LENGTH = 8

export function extractPhoneBody(value: string): string {
  const digits = value.replace(/\D/g, '')
  const body = digits.startsWith('010') ? digits.slice(3) : digits
  return body.slice(0, PHONE_BODY_LENGTH)
}

export function formatPhoneBody(body: string): string {
  const d = body.slice(0, PHONE_BODY_LENGTH)
  if (d.length === 0) return '010-'
  if (d.length <= 4) return `010-${d}`
  return `010-${d.slice(0, 4)}-${d.slice(4)}`
}

export function phoneBodyToFull(body: string): string {
  return `010${body.slice(0, PHONE_BODY_LENGTH)}`
}

export function isPhoneBodyComplete(body: string): boolean {
  return body.length === PHONE_BODY_LENGTH
}
