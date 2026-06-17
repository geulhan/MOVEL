import type { Json } from '../types/database'
import { clearPlatformAuth } from './platformSession'

export class PlatformSessionExpiredError extends Error {
  constructor() {
    super('플랫폼 로그인이 만료되었습니다. 다시 로그인해 주세요.')
    this.name = 'PlatformSessionExpiredError'
  }
}

export function parsePlatformRpcRow(
  data: Json,
  fallbackMessage: string,
): Record<string, Json | undefined> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${fallbackMessage} (응답 형식 오류)`)
  }
  return data as Record<string, Json | undefined>
}

export function assertPlatformRpcOk(
  row: Record<string, Json | undefined>,
  fallbackMessage: string,
): void {
  if (row.ok === true) return

  if (row.error === 'unauthorized') {
    clearPlatformAuth()
    throw new PlatformSessionExpiredError()
  }

  const detail =
    row.message != null
      ? String(row.message)
      : row.error != null
        ? String(row.error)
        : null

  throw new Error(detail ? `${fallbackMessage}: ${detail}` : fallbackMessage)
}
