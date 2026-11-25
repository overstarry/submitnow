export type MdxHrefKind = 'external' | 'localized-internal' | 'raw-internal';

const LOCALE_PREFIX_RE = /^\/(en|zh|ja)(?:\/|$)/;
const STATIC_ASSET_EXT_RE = /\.[a-z0-9]{1,8}$/i;

/**
 * Classifies an href found in MDX prose so internal application routes can be
 * rendered with next-intl's locale-aware Link without double-prefixing paths
 * that already carry a locale segment or point to static files like /llms.txt.
 */
export function classifyMdxHref(href: string | undefined): MdxHrefKind {
  if (!href) return 'raw-internal';
  if (/^https?:\/\//i.test(href)) return 'external';
  if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return 'raw-internal';
  }
  if (!href.startsWith('/')) return 'raw-internal';
  if (LOCALE_PREFIX_RE.test(href)) return 'raw-internal';

  const pathname = href.split(/[?#]/)[0] || '/';
  if (pathname !== '/' && STATIC_ASSET_EXT_RE.test(pathname)) {
    return 'raw-internal';
  }

  return 'localized-internal';
}
