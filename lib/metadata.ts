import { siteConfig } from '@/config/site'
import { DEFAULT_LOCALE, LOCALES, Locale } from '@/i18n/routing'
import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

const OG_LOCALE_MAP: Record<string, string> = {
  en: 'en_US',
  zh: 'zh_CN',
  ja: 'ja_JP',
}

type MetadataProps = {
  page?: string
  title?: string
  description?: string
  images?: string[]
  noIndex?: boolean
  locale: Locale
  path?: string
  canonicalUrl?: string
  keywords?: string[]
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  tags?: string[]
}

function normalizePath(rawPath?: string): string | undefined {
  if (rawPath === undefined) return undefined
  if (rawPath === '' || rawPath === '/') return ''
  const withLeading = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
  return withLeading.replace(/\/+$/, '')
}

export function buildLocalizedUrl(locale: string, rawPath = '/'): string {
  const normalized = normalizePath(rawPath) ?? ''
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`
  return `${siteConfig.url}${prefix}${normalized}`
}

export function buildLanguageAlternates(rawPath = '/'): Record<string, string> {
  const languages = LOCALES.reduce((acc, lang) => {
    acc[lang] = buildLocalizedUrl(lang, rawPath)
    return acc
  }, {} as Record<string, string>)

  languages['x-default'] = buildLocalizedUrl(DEFAULT_LOCALE, rawPath)
  return languages
}

export async function constructMetadata({
  page = 'Home',
  title,
  description,
  images = [],
  noIndex = false,
  locale,
  path,
  canonicalUrl,
  keywords = [],
  type = 'website',
  publishedTime,
  modifiedTime,
  tags,
}: MetadataProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'Home' })

  const pageTitle = title || t('title')
  const pageDescription = description || t('description')

  const finalTitle =
    page === 'Home'
      ? `${pageTitle} - ${t('tagLine')}`
      : `${pageTitle} | ${t('title')}`

  const imageUrls =
    images.length > 0
      ? images.map((img) => ({
          url: img.startsWith('http')
            ? img
            : img.startsWith('/')
              ? `${siteConfig.url}${img}`
              : `${siteConfig.url}/${img}`,
          width: 1200,
          height: 630,
          alt: pageTitle,
        }))
      : [
          {
            url: `${siteConfig.url}/og.png`,
            width: 1200,
            height: 630,
            alt: pageTitle,
          },
        ]

  const effectivePath = canonicalUrl ?? path
  const pageURL =
    effectivePath !== undefined
      ? buildLocalizedUrl(locale, effectivePath)
      : buildLocalizedUrl(locale, '/')

  const alternates =
    !noIndex && effectivePath !== undefined
      ? {
          canonical: buildLocalizedUrl(locale, effectivePath),
          languages: buildLanguageAlternates(effectivePath),
        }
      : undefined

  const ogLocale = OG_LOCALE_MAP[locale] ?? locale
  const alternateLocale = LOCALES.filter((lang) => lang !== locale).map(
    (lang) => OG_LOCALE_MAP[lang] ?? lang
  )

  const openGraphBase = {
    title: finalTitle,
    description: pageDescription,
    url: pageURL,
    siteName: t('title'),
    locale: ogLocale,
    alternateLocale,
    images: imageUrls,
  }

  const openGraph: Metadata['openGraph'] =
    type === 'article'
      ? {
          ...openGraphBase,
          type: 'article',
          publishedTime,
          modifiedTime: modifiedTime || publishedTime,
          authors: siteConfig.authors.map((author) => author.name),
          tags,
        }
      : {
          ...openGraphBase,
          type: 'website',
        }

  return {
    title: finalTitle,
    description: pageDescription,
    keywords: keywords.length > 0 ? keywords : undefined,
    authors: siteConfig.authors,
    creator: siteConfig.creator,
    metadataBase: new URL(siteConfig.url),
    icons: siteConfig.icons,
    manifest: '/manifest.webmanifest',
    alternates,
    openGraph,
    twitter: {
      card: 'summary_large_image',
      title: finalTitle,
      description: pageDescription,
      site: siteConfig.creator,
      images: imageUrls,
      creator: siteConfig.creator,
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
      },
    },
  }
}
