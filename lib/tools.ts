import {
  Code2,
  FileKey2,
  GitCompareArrows,
  ListChecks,
  ShieldCheck,
  WandSparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type ToolId =
  | 'keyGenerator'
  | 'keyChecker'
  | 'urlNormalizer'
  | 'batchBuilder'
  | 'sitemapDiff'
  | 'codeGenerator'

export type ToolDefinition = {
  id: ToolId
  href: string
  icon: LucideIcon
  /** Ordered from "first step of the workflow" to "last". */
  order: number
  /** Related /docs/[slug] guides surfaced in the tool page sidebar. */
  relatedDocSlugs: string[]
}

export const TOOLS: ToolDefinition[] = [
  {
    id: 'keyGenerator',
    href: '/tools/indexnow-key-generator',
    icon: FileKey2,
    order: 1,
    relatedDocSlugs: ['indexnow-bing-submission', 'status-codes/403', 'integrations/nextjs'],
  },
  {
    id: 'keyChecker',
    href: '/tools/indexnow-key-checker',
    icon: ShieldCheck,
    order: 2,
    relatedDocSlugs: ['status-codes/403', 'status-codes/202', 'integrations/wordpress'],
  },
  {
    id: 'urlNormalizer',
    href: '/tools/url-normalizer',
    icon: WandSparkles,
    order: 3,
    relatedDocSlugs: ['status-codes/422', 'status-codes/400', 'indexnow-bing-submission'],
  },
  {
    id: 'batchBuilder',
    href: '/tools/indexnow-batch-builder',
    icon: ListChecks,
    order: 4,
    relatedDocSlugs: ['status-codes/422', 'status-codes/429', 'indexnow-bing-submission'],
  },
  {
    id: 'sitemapDiff',
    href: '/tools/sitemap-diff',
    icon: GitCompareArrows,
    order: 5,
    relatedDocSlugs: ['status-codes/429', 'integrations/nextjs', 'indexnow-bing-submission'],
  },
  {
    id: 'codeGenerator',
    href: '/tools/indexnow-code-generator',
    icon: Code2,
    order: 6,
    relatedDocSlugs: ['integrations/nextjs', 'integrations/cloudflare-workers', 'status-codes/400'],
  },
]

export function getTool(id: ToolId): ToolDefinition {
  const tool = TOOLS.find((item) => item.id === id)
  if (!tool) throw new Error(`Unknown tool id: ${id}`)
  return tool
}

/** The other tools, ordered so the natural next step comes first. */
export function getRelatedTools(id: ToolId): ToolDefinition[] {
  const current = getTool(id)
  return TOOLS.filter((tool) => tool.id !== id).sort((a, b) => {
    const aNext = a.order > current.order ? 0 : 1
    const bNext = b.order > current.order ? 0 : 1
    return aNext - bNext || a.order - b.order
  })
}
