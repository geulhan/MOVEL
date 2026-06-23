/** 프로덕션 공개 URL (알림톡·문자 링크) */
export const MOTIONHUB_PUBLIC_ORIGIN = 'https://motionhub.kr'

/** 레거시 Vercel URL 등을 motionhub.kr 로 정규화 */
export function normalizePublicSiteUrl(siteUrl?: string | null): string {
  const raw = (siteUrl ?? MOTIONHUB_PUBLIC_ORIGIN).trim().replace(/\/$/, '')
  if (!raw) return MOTIONHUB_PUBLIC_ORIGIN
  if (/vercel\.app/i.test(raw) || /localhost/i.test(raw)) {
    return MOTIONHUB_PUBLIC_ORIGIN
  }
  return raw
}
