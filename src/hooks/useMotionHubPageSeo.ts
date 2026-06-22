import { useEffect } from 'react'
import {
  getMotionHubOgImageUrl,
  MOTIONHUB_GUIDE_SEO,
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

export type MotionHubPageSeoConfig = {
  title: string
  description: string
  ogTitle?: string
  ogDescription?: string
  canonicalPath?: string
}

export function useMotionHubPageSeo(config: MotionHubPageSeoConfig) {
  useEffect(() => {
    const prevTitle = document.title
    const prevDesc = document
      .querySelector('meta[name="description"]')
      ?.getAttribute('content')

    const ogTitle = config.ogTitle ?? config.title
    const ogDescription = config.ogDescription ?? config.description
    const canonicalUrl = config.canonicalPath
      ? `${MOTIONHUB_SITE_URL}${config.canonicalPath}`
      : MOTIONHUB_SITE_URL

    document.title = config.title
    upsertMeta('meta[name="description"]', { name: 'description' }, config.description)
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, MOTIONHUB_SEO.siteName)
    upsertMeta('meta[property="og:locale"]', { property: 'og:locale' }, MOTIONHUB_SEO.locale)
    upsertMeta('meta[property="og:title"]', { property: 'og:title' }, ogTitle)
    upsertMeta(
      'meta[property="og:description"]',
      { property: 'og:description' },
      ogDescription,
    )
    upsertMeta('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl)
    upsertMeta('meta[property="og:type"]', { property: 'og:type' }, MOTIONHUB_SEO.ogType)
    upsertMeta(
      'meta[property="og:image"]',
      { property: 'og:image' },
      getMotionHubOgImageUrl(),
    )
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, MOTIONHUB_SEO.twitterCard)
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, ogTitle)
    upsertMeta(
      'meta[name="twitter:description"]',
      { name: 'twitter:description' },
      ogDescription,
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
  }, [config.title, config.description, config.ogTitle, config.ogDescription, config.canonicalPath])
}

export function useMotionHubSeo() {
  useMotionHubPageSeo({
    title: MOTIONHUB_SEO.title,
    description: MOTIONHUB_SEO.description,
    ogTitle: MOTIONHUB_SEO.ogTitle,
    ogDescription: MOTIONHUB_SEO.ogDescription,
  })
}

export function useMotionHubGuideSeo() {
  useMotionHubPageSeo({
    title: MOTIONHUB_GUIDE_SEO.title,
    description: MOTIONHUB_GUIDE_SEO.description,
    ogTitle: MOTIONHUB_GUIDE_SEO.ogTitle,
    ogDescription: MOTIONHUB_GUIDE_SEO.ogDescription,
    canonicalPath: MOTIONHUB_GUIDE_SEO.canonicalPath,
  })
}
