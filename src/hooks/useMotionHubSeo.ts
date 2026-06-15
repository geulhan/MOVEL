import { useEffect } from 'react'
import {
  getMotionHubOgImageUrl,
  MOTIONHUB_SEO,
  MOTIONHUB_SITE_URL,
} from '../constants/motionhubSeo'

function upsertMeta(
  selector: string,
  attrs: Record<string, string>,
  content: string,
) {
  let el = document.querySelector(selector) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    Object.entries(attrs).forEach(([key, value]) => el!.setAttribute(key, value))
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * 클라이언트 메타 동기화.
 * 카카오·네이버 크롤러는 JS를 실행하지 않으므로 motionhub.kr 은 motionhub.html 정적 메타를 사용합니다.
 */
export function useMotionHubSeo() {
  useEffect(() => {
    const prevTitle = document.title
    const prevDesc = document
      .querySelector('meta[name="description"]')
      ?.getAttribute('content')

    document.title = MOTIONHUB_SEO.title
    upsertMeta('meta[name="description"]', { name: 'description' }, MOTIONHUB_SEO.description)
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, 'MotionHub')
    upsertMeta('meta[property="og:locale"]', { property: 'og:locale' }, MOTIONHUB_SEO.locale)
    upsertMeta('meta[property="og:title"]', { property: 'og:title' }, MOTIONHUB_SEO.title)
    upsertMeta(
      'meta[property="og:description"]',
      { property: 'og:description' },
      MOTIONHUB_SEO.description,
    )
    upsertMeta('meta[property="og:url"]', { property: 'og:url' }, MOTIONHUB_SITE_URL)
    upsertMeta('meta[property="og:type"]', { property: 'og:type' }, MOTIONHUB_SEO.ogType)
    upsertMeta(
      'meta[property="og:image"]',
      { property: 'og:image' },
      getMotionHubOgImageUrl(),
    )
    upsertMeta(
      'meta[property="og:image:width"]',
      { property: 'og:image:width' },
      String(MOTIONHUB_SEO.ogImageWidth),
    )
    upsertMeta(
      'meta[property="og:image:height"]',
      { property: 'og:image:height' },
      String(MOTIONHUB_SEO.ogImageHeight),
    )
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, MOTIONHUB_SEO.twitterCard)
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, MOTIONHUB_SEO.title)
    upsertMeta(
      'meta[name="twitter:description"]',
      { name: 'twitter:description' },
      MOTIONHUB_SEO.description,
    )
    upsertMeta(
      'meta[name="twitter:image"]',
      { name: 'twitter:image' },
      getMotionHubOgImageUrl(),
    )

    return () => {
      document.title = prevTitle
      const meta = document.querySelector('meta[name="description"]')
      if (meta && prevDesc) meta.setAttribute('content', prevDesc)
    }
  }, [])
}
