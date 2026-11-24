import { DEFAULT_LOCALE, LOCALES } from '@/i18n/routing'
import { getDocs } from '@/lib/docs'
import { getPosts } from '@/lib/getBlogs'
import { buildLanguageAlternates, buildLocalizedUrl } from '@/lib/metadata'
import fs from 'fs/promises'
import matter from 'gray-matter'
import { MetadataRoute } from 'next'
import path from 'path'

const CONTENT_RELEASE_DATE = new Date('2026-11-24')

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>

type StaticRoute = {
  path: string
  priority: number
  changeFrequency: ChangeFrequency
  /** MDX file under content/ whose `lastUpdated` frontmatter drives lastModified. */
  contentDir?: string
  /** Explicit deterministic lastModified date (avoids CI checkout mtime resets). */
  lastModified?: Date
}

// Tool pages are the acquisition surface of the site, so they outrank the
// legal pages. Dates come from frontmatter or explicit content release dates
// instead of `new Date()` or filesystem mtime (which resets on every CI build).
const STATIC_ROUTES: StaticRoute[] = [
  {
    path: '/',
    priority: 1.0,
    changeFrequency: 'weekly',
    lastModified: CONTENT_RELEASE_DATE,
  },
  {
    path: '/tools',
    priority: 0.9,
    changeFrequency: 'weekly',
    lastModified: CONTENT_RELEASE_DATE,
  },
  {
    path: '/tools/indexnow-key-generator',
    priority: 0.9,
    changeFrequency: 'monthly',
    lastModified: CONTENT_RELEASE_DATE,
  },
  {
    path: '/tools/indexnow-key-checker',
    priority: 0.9,
    changeFrequency: 'monthly',
    lastModified: CONTENT_RELEASE_DATE,
  },
  {
    path: '/tools/indexnow-batch-builder',
    priority: 0.9,
    changeFrequency: 'monthly',
    lastModified: CONTENT_RELEASE_DATE,
  },
  {
    path: '/tools/sitemap-diff',
    priority: 0.9,
    changeFrequency: 'monthly',
    lastModified: CONTENT_RELEASE_DATE,
  },
  {
    path: '/tools/url-normalizer',
    priority: 0.9,
    changeFrequency: 'monthly',
    lastModified: CONTENT_RELEASE_DATE,
  },
  {
    path: '/tools/indexnow-code-generator',
    priority: 0.9,
    changeFrequency: 'monthly',
    lastModified: CONTENT_RELEASE_DATE,
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

  return route.lastModified ?? CONTENT_RELEASE_DATE
}

function newestDate(dates: Date[]): Date {
  const valid = dates.filter((d) => !Number.isNaN(d.getTime()))
  if (valid.length === 0) return CONTENT_RELEASE_DATE
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

  return [...pages, ...docsIndexPages, ...docs, ...blogIndexPages, ...blogPosts]
}
