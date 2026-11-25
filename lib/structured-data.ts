import { NPM_PACKAGE_URL, siteConfig } from '@/config/site'
import { DEFAULT_LOCALE } from '@/i18n/routing'

type JsonLdObject = Record<string, unknown>

export function absoluteUrl(locale: string, path: string): string {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`
  const suffix = path === '/' ? '' : path
  return `${siteConfig.url}${prefix}${suffix}`
}

export function websiteSchema(locale: string, description?: string): JsonLdObject {
  return {
    '@type': 'WebSite',
    '@id': `${siteConfig.url}/#website`,
    name: siteConfig.name,
    url: absoluteUrl(locale, '/'),
    description: description || siteConfig.description,
    inLanguage: locale,
    publisher: { '@id': `${siteConfig.url}/#organization` },
  }
}

export function organizationSchema(): JsonLdObject {
  return {
    '@type': 'Organization',
    '@id': `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    alternateName: ['SubmitNow', 'indexNow-gui'],
    description: siteConfig.description,
    url: siteConfig.url,
    logo: {
      '@type': 'ImageObject',
      url: `${siteConfig.url}/logo.png`,
      width: 512,
      height: 512,
    },
    knowsAbout: [
      'IndexNow',
      'Bing Webmaster Tools',
      'ChatGPT Search',
      'Microsoft Copilot',
      'XML Sitemaps',
      'Model Context Protocol (MCP)',
      'Technical SEO',
    ],
    sameAs: [siteConfig.socialLinks?.github, NPM_PACKAGE_URL].filter(Boolean),
  }
}

export function aboutPageSchema({
  locale,
  title,
  description,
}: {
  locale: string
  title: string
  description: string
}): JsonLdObject {
  const url = absoluteUrl(locale, '/about')

  return {
    '@type': 'AboutPage',
    '@id': `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: locale,
    isPartOf: { '@id': `${siteConfig.url}/#website` },
    mainEntity: { '@id': `${siteConfig.url}/#organization` },
  }
}

export function breadcrumbSchema(
  locale: string,
  trail: { name: string; path: string }[]
): JsonLdObject {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(locale, crumb.path),
    })),
  }
}

export function faqPageSchema(
  faq: { question: string; answer: string }[]
): JsonLdObject | null {
  if (faq.length === 0) return null

  return {
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

export function softwareApplicationSchema({
  locale,
  path,
  name,
  description,
  featureList,
}: {
  locale: string
  path: string
  name: string
  description: string
  featureList?: string[]
}): JsonLdObject {
  const url = absoluteUrl(locale, path)

  return {
    '@type': 'SoftwareApplication',
    '@id': `${url}#software`,
    name,
    description,
    url,
    applicationCategory: 'DeveloperApplication',
    applicationSubCategory: 'SEO Tool',
    operatingSystem: 'Any',
    browserRequirements: 'Requires a modern browser with JavaScript enabled.',
    inLanguage: locale,
    isAccessibleForFree: true,
    license: 'https://opensource.org/licenses/MIT',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    ...(featureList && featureList.length > 0 ? { featureList } : {}),
    publisher: { '@id': `${siteConfig.url}/#organization` },
  }
}

export function howToSchema({
  name,
  steps,
}: {
  name: string
  steps: string[]
}): JsonLdObject | null {
  if (steps.length === 0) return null

  return {
    '@type': 'HowTo',
    name,
    step: steps.map((text, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      text,
    })),
  }
}

export function articleSchema({
  locale,
  path,
  title,
  description,
  datePublished,
  dateModified,
  image,
}: {
  locale: string
  path: string
  title: string
  description?: string
  datePublished?: string
  dateModified?: string
  image?: string
}): JsonLdObject {
  const url = absoluteUrl(locale, path)

  return {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: title,
    description,
    url,
    mainEntityOfPage: url,
    inLanguage: locale,
    datePublished,
    dateModified: dateModified || datePublished,
    image: image
      ? [image.startsWith('http') ? image : `${siteConfig.url}${image}`]
      : [`${siteConfig.url}/og.png`],
    author: siteConfig.authors?.map((author) => ({
      '@type': 'Person',
      name: author.name,
      url: author.url,
    })),
    publisher: { '@id': `${siteConfig.url}/#organization` },
  }
}

export function techArticleSchema({
  locale,
  path,
  title,
  description,
  datePublished,
  dateModified,
  image,
}: {
  locale: string
  path: string
  title: string
  description: string
  datePublished: string
  dateModified?: string
  image?: string
}): JsonLdObject {
  const url = absoluteUrl(locale, path)

  return {
    '@type': 'TechArticle',
    '@id': `${url}#article`,
    headline: title,
    description,
    url,
    mainEntityOfPage: url,
    inLanguage: locale,
    datePublished,
    dateModified: dateModified || datePublished,
    image: image
      ? [image.startsWith('http') ? image : `${siteConfig.url}${image}`]
      : [`${siteConfig.url}/og.png`],
    author: siteConfig.authors?.map((author) => ({
      '@type': 'Person',
      name: author.name,
      url: author.url,
    })),
    publisher: { '@id': `${siteConfig.url}/#organization` },
    proficiencyLevel: 'Beginner',
  }
}

/**
 * Wraps the graph nodes for a page in a single `@graph` document so each page
 * emits exactly one JSON-LD block.
 */
export function buildGraph(nodes: (JsonLdObject | null | undefined)[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter((node): node is JsonLdObject => Boolean(node)),
  }
}
