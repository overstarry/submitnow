import { siteConfig } from '@/config/site'
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/routing'
import { getDocs } from '@/lib/docs'
import { getPosts } from '@/lib/getBlogs'
import fs from 'fs/promises'
import matter from 'gray-matter'
import { MetadataRoute } from 'next'
import path from 'path'

const siteUrl = siteConfig.url
const FALLBACK_LAST_MODIFIED = new Date('2026-01-14')

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>

type StaticRoute = {
  path: string
  priority: number
  changeFrequency: ChangeFrequency
  /** MDX file under content/ whose `lastUpdated` frontmatter drives lastModified. */
  contentDir?: string
  /** Source files whose mtime drives lastModified when there is no MDX frontmatter. */
  sources?: string[]
}

// Tool pages are the acquisition surface of the site, so they outrank the
// legal pages. Dates come from real file metadata instead of `new Date()`,
// which would tell crawlers every page changes on every deploy.
const STATIC_ROUTES: StaticRoute[] = [
  {
    path: '',
    priority: 1.0,
    changeFrequency: 'weekly',
    sources: ['components/home/index.tsx', 'components/home/Hero.tsx', 'i18n/messages/en.json'],
  },
  {
    path: '/tools',
    priority: 0.9,
    changeFrequency: 'weekly',
    sources: ['components/tools/ToolsHub.tsx'],
  },
  {
    path: '/tools/indexnow-key-generator',
    priority: 0.9,
    changeFrequency: 'monthly',
    sources: ['components/tools/IndexNowKeyGenerator.tsx'],
  },
  {
    path: '/tools/indexnow-key-checker',
    priority: 0.9,
    changeFrequency: 'monthly',
    sources: ['components/tools/IndexNowKeyChecker.tsx'],
  },
  {
    path: '/tools/indexnow-batch-builder',
    priority: 0.9,
    changeFrequency: 'monthly',
    sources: ['components/tools/IndexNowBatchBuilder.tsx'],
  },
  {
    path: '/tools/sitemap-diff',
    priority: 0.9,
    changeFrequency: 'monthly',
    sources: ['components/tools/SitemapDiff.tsx'],
  },
  {
    path: '/tools/url-normalizer',
    priority: 0.9,
    changeFrequency: 'monthly',
    sources: ['components/tools/UrlNormalizer.tsx'],
  },
  {
    path: '/tools/indexnow-code-generator',
    priority: 0.9,
    changeFrequency: 'monthly',
    sources: ['components/tools/IndexNowCodeGenerator.tsx'],
  },
  {
    path: '/docs',
    priority: 0.8,
    changeFrequency: 'weekly',
    sources: ['content/docs/{locale}.json'],
  },
  {
    path: '/blog',
    priority: 0.7,
    changeFrequency: 'weekly',
    sources: ['blogs/en'],
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

async function mtimeOf(relativePath: string): Promise<Date | null> {
  try {
    const stats = await fs.stat(path.join(process.cwd(), relativePath))
    return stats.mtime
  } catch {
    return null
  }
}

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

async function resolveLastModified(route: StaticRoute, locale: string): Promise<Date> {
  if (route.contentDir) {
    const fromFrontmatter =
      (await frontmatterDate(route.contentDir, locale)) ??
      (await frontmatterDate(route.contentDir, DEFAULT_LOCALE))
    if (fromFrontmatter) return fromFrontmatter
  }

  const mtimes = await Promise.all(
    (route.sources ?? []).map((source) => mtimeOf(source.replace('{locale}', locale)))
  )
  const newest = mtimes
    .filter((value): value is Date => value !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0]

  return newest ?? FALLBACK_LAST_MODIFIED
}

function localizedUrl(locale: string, page: string): string {
  return `${siteUrl}${locale === DEFAULT_LOCALE ? '' : `/${locale}`}${page}`
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await Promise.all(
    LOCALES.flatMap((locale) =>
      STATIC_ROUTES.map(async (route) => ({
        url: localizedUrl(locale, route.path),
        lastModified: await resolveLastModified(route, locale),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      }))
    )
  )

  const blogPosts = await Promise.all(
    LOCALES.map(async (locale) => {
      const { posts } = await getPosts(locale)
      return posts.map((post) => ({
        url: localizedUrl(locale, `/blog${post.slug}`),
        lastModified: new Date(post.metadata.updatedAt || post.date),
        changeFrequency: 'monthly' as ChangeFrequency,
        priority: 0.6,
      }))
    })
  ).then((results) => results.flat())

  const docs = LOCALES.flatMap((locale) =>
    getDocs(locale).map((doc) => ({
      url: localizedUrl(locale, `/docs/${doc.slug}`),
      lastModified: new Date(doc.updatedAt),
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: doc.category === 'guide' ? 0.8 : 0.7,
    }))
  )

  return [...pages, ...docs, ...blogPosts]
}
