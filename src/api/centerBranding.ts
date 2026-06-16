import { getAdminSession } from '../lib/adminSession'
import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import {
  DEFAULT_CENTER_THEME,
  parseCenterTheme,
  type CenterBranding,
  type CenterTheme,
} from '../types/centerBranding'
import type { Json } from '../types/database'

const LOGO_BUCKET = 'center-logos'
const MAX_LOGO_BYTES = 2 * 1024 * 1024
const LOGO_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg'] as const

function withCacheBuster(publicUrl: string): string {
  const base = publicUrl.split('?')[0]
  return `${base}?v=${Date.now()}`
}

async function removeExistingCenterLogos(centerId: string): Promise<void> {
  const paths = LOGO_EXTENSIONS.map((ext) => `${centerId}/logo.${ext}`)
  const { error } = await supabase.storage.from(LOGO_BUCKET).remove(paths)
  if (error) {
    console.warn('기존 로고 파일 삭제 실패:', error.message)
  }
}

export async function fetchCenterBranding(
  centerId?: string,
): Promise<CenterBranding> {
  const id = centerId ?? (await getCurrentCenterId())

  const { data, error } = await supabase
    .from('centers')
    .select('id, name, slug, logo_url, settings')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('센터 정보를 찾을 수 없습니다.')

  const settings =
    data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)
      ? (data.settings as Record<string, Json | undefined>)
      : {}

  const slug = String(data.slug)
  const logoUrl = data.logo_url ? String(data.logo_url) : null

  return {
    centerId: String(data.id),
    centerName: String(data.name),
    centerSlug: slug,
    logoUrl,
    theme: parseCenterTheme(settings.theme),
  }
}

export async function uploadCenterLogo(
  centerId: string,
  file: File,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있습니다.')
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error('로고는 2MB 이하만 가능합니다.')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const imagePath = `${centerId}/logo.${ext}`

  await removeExistingCenterLogos(centerId)

  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(imagePath, file, {
      cacheControl: '60',
      upsert: true,
      contentType: file.type || undefined,
    })

  if (uploadError) {
    throw new Error(`로고 업로드 실패: ${uploadError.message}`)
  }

  const { data: urlData } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(imagePath)
  return withCacheBuster(urlData.publicUrl)
}

export async function saveCenterBranding(input: {
  theme: CenterTheme
  logoUrl?: string | null
  clearLogo?: boolean
}): Promise<CenterBranding> {
  const session = getAdminSession()
  if (!session?.token) {
    throw new Error('관리자 로그인이 필요합니다.')
  }

  const { data, error } = await supabase.rpc('update_center_branding', {
    p_session_token: session.token,
    p_theme: input.theme as unknown as Json,
    p_logo_url: input.logoUrl ?? null,
    p_clear_logo: Boolean(input.clearLogo),
  })

  if (error) throw error

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('센터 설정 저장에 실패했습니다.')
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    throw new Error('센터 설정 저장에 실패했습니다.')
  }

  return fetchCenterBranding(session.centerId)
}

export function getDefaultTheme(): CenterTheme {
  return { ...DEFAULT_CENTER_THEME }
}
