import { DEFAULT_LOCALE, LOCALES } from '@/i18n/routing'
import { getCompareContent } from '@/lib/compare'
import { getDocs } from '@/lib/docs'
import { getPosts } from '@/lib/getBlogs'
import { buildLanguageAlternates, buildLocalizedUrl } from '@/lib/metadata'
import { getPricingContent } from '@/lib/pricing'
import fs from 'fs/promises'
import matter from 'gray-matter'
import { MetadataRoute } from 'next'
import path from 'path'

const FALLBACK_LAST_MODIFIED = new Date('2026-11-24')

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>

type StaticRoute = {
  path: string
  priority: number
  changeFrequency: ChangeFrequency
  /** MDX file under content/ whose `lastUpdated` frontmatter drives lastModified. */
  contentDir?: string
  /** Explicit per-route substantive content update date (do not bulk-restamp on every release). */
  lastModified?: Date
}

// Each static route tracks its own substantive content update date instead of
// sharing one global release constant or filesystem mtime (which resets on CI
// checkouts and causes search engines to distrust <lastmod>).
const STATIC_ROUTES: StaticRoute[] = [
  {
    path: '/',
    priority: 1.0,
    changeFrequency: 'weekly',
    lastModified: new Date('2026-11-25'),
  },
  {
    path: '/tools',
    priority: 0.9,
    changeFrequency: 'weekly',
    lastModified: new Date('2026-11-24'),
  },
  {
    path: '/tools/indexnow-key-generator',
    priority: 0.9,
    changeFrequency: 'monthly',
    lastModified: new Date('2026-11-25'),
  },
  {
    path: '/tools/indexnow-key-checker',
    priority: 0.9,
    changeFrequency: 'monthly',
    lastModified: new Date('2026-11-25'),
  },
  {
    path: '/tools/indexnow-batch-builder',
    priority: 0.9,
    changeFrequency: 'monthly',
    lastModified: new Date('2026-11-25'),
  },
  {
    path: '/tools/sitemap-diff',
    priority: 0.9,
    changeFrequency: 'monthly',
    lastModified: new Date('2026-11-25'),
  },
  {
    path: '/tools/url-normalizer',
    priority: 0.9,
    changeFrequency: 'monthly',
    lastModified: new Date('2026-11-25'),
  },
  {
    path: '/tools/indexnow-code-generator',
    priority: 0.9,
    changeFrequency: 'monthly',
    lastModified: new Date('2026-11-25'),
  },
  { path: '/about', priority: 0.5, changeFrequency: 'monthly', contentDir: 'about' },
  {
    path: '/privacy-policy',
    priority: 0.3,
    changeFrequency: 'yearly',
    contentDir: 'privacy-policy',
  },
  {
    path: '/terms-of-service',
    priority: 0.3,
    changeFrequency: 'yearly',
    contentDir: 'terms-of-service',
  },
]

async function frontmatterDate(contentDir: string, locale: string): Promise<Date | null> {
  const filePath = path.join(process.cwd(), 'content', contentDir, `${locale}.mdx`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const { data } = matter(raw)
    const value = data.lastUpdated || data.date
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  } catch {
    return null
  }
}

async function resolveStaticLastModified(route: StaticRoute, locale: string): Promise<Date> {
  if (route.contentDir) {
    const fromFrontmatter =
      (await frontmatterDate(route.contentDir, locale)) ??
      (await frontmatterDate(route.contentDir, DEFAULT_LOCALE))
    if (fromFrontmatter) return fromFrontmatter
  }

  return route.lastModified ?? FALLBACK_LAST_MODIFIED
}

function newestDate(dates: Date[]): Date {
  const valid = dates.filter((d) => !Number.isNaN(d.getTime()))
  if (valid.length === 0) return FALLBACK_LAST_MODIFIED
  return valid.sort((a, b) => b.getTime() - a.getTime())[0]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await Promise.all(
    LOCALES.flatMap((locale) =>
      STATIC_ROUTES.map(async (route) => ({
        url: buildLocalizedUrl(locale, route.path),
        lastModified: await resolveStaticLastModified(route, locale),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: {
          languages: buildLanguageAlternates(route.path),
        },
      }))
    )
  )

  const decisionPages = LOCALES.flatMap((locale) => {
    const compare = getCompareContent(locale)
    const pricing = getPricingContent(locale)
    return [
      {
        url: buildLocalizedUrl(locale, '/compare'),
        lastModified: new Date(compare.updatedAt),
        changeFrequency: 'monthly' as ChangeFrequency,
        priority: 0.85,
        alternates: {
          languages: buildLanguageAlternates('/compare'),
        },
      },
      {
        url: buildLocalizedUrl(locale, '/pricing'),
        lastModified: new Date(pricing.updatedAt),
        changeFrequency: 'monthly' as ChangeFrequency,
        priority: 0.8,
        alternates: {
          languages: buildLanguageAlternates('/pricing'),
        },
      },
    ]
  })

  const docsIndexPages = LOCALES.map((locale) => {
    const localeDocs = getDocs(locale)
    return {
      url: buildLocalizedUrl(locale, '/docs'),
      lastModified: newestDate(localeDocs.map((doc) => new Date(doc.updatedAt))),
      changeFrequency: 'weekly' as ChangeFrequency,
      priority: 0.8,
      alternates: {
        languages: buildLanguageAlternates('/docs'),
      },
    }
  })

  const docs = LOCALES.flatMap((locale) =>
    getDocs(locale).map((doc) => {
      const routePath = `/docs/${doc.slug}`
      return {
        url: buildLocalizedUrl(locale, routePath),
        lastModified: new Date(doc.updatedAt),
        changeFrequency: 'monthly' as ChangeFrequency,
        priority: doc.category === 'guide' ? 0.8 : 0.7,
        alternates: {
          languages: buildLanguageAlternates(routePath),
        },
      }
    })
  )

  const postsByLocale = await Promise.all(
    LOCALES.map(async (locale) => ({
      locale,
      posts: (await getPosts(locale)).posts,
    }))
  )

  const blogIndexPages = postsByLocale.map(({ locale, posts }) => ({
    url: buildLocalizedUrl(locale, '/blog'),
    lastModified: newestDate(
      posts.map((post) => new Date(post.metadata.updatedAt || post.date))
    ),
    changeFrequency: 'weekly' as ChangeFrequency,
    priority: 0.7,
    alternates: {
      languages: buildLanguageAlternates('/blog'),
    },
  }))

  const blogPosts = postsByLocale.flatMap(({ locale, posts }) =>
    posts.map((post) => {
      const routePath = `/blog${post.slug}`
      return {
        url: buildLocalizedUrl(locale, routePath),
        lastModified: new Date(post.metadata.updatedAt || post.date),
        changeFrequency: 'monthly' as ChangeFrequency,
        priority: 0.6,
        alternates: {
          languages: buildLanguageAlternates(routePath),
        },
      }
    })
  )

  return [...pages, ...decisionPages, ...docsIndexPages, ...docs, ...blogIndexPages, ...blogPosts]
}
