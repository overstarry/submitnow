export const MAX_INDEXNOW_BATCH_SIZE = 10_000;
/**
 * Safe per-batch UTF-8 payload cap (~2 MB) so even long URLs stay well inside
 * Next.js Server Action and IndexNow endpoint payload budgets.
 */
export const MAX_INDEXNOW_BATCH_BYTES = 2 * 1024 * 1024;

export type UrlGroup = {
  host: string;
  urls: string[];
};

export type UrlListAnalysis = {
  inputCount: number;
  validUrls: string[];
  invalidInputs: string[];
  duplicateCount: number;
  hostGroups: UrlGroup[];
};

export type SitemapEntry = {
  url: string;
  lastModified?: string;
};

export type SitemapParseError = "invalid_xml" | "empty_urlset";

export type SitemapParseResult = {
  type: "urlset" | "index" | "unsupported";
  entries: SitemapEntry[];
  childSitemaps: string[];
  invalidLocations: string[];
  duplicateCount: number;
  error?: SitemapParseError;
};

export type SitemapDiff = {
  added: SitemapEntry[];
  changed: SitemapEntry[];
  removed: SitemapEntry[];
  unchangedCount: number;
};

export type SitemapLastModFilterResult = {
  matched: SitemapEntry[];
  withoutLastModCount: number;
  olderCount: number;
};

export type UrlNormalizationOptions = {
  removeFragment: boolean;
  removeTrackingParameters: boolean;
  sortQueryParameters: boolean;
  removeTrailingSlash: boolean;
};

export type NormalizedUrlResult = {
  original: string;
  normalized?: string;
  changes: (
    | "fragment_removed"
    | "tracking_removed"
    | "query_sorted"
    | "trailing_slash_removed"
    | "canonicalized"
  )[];
  error?: "invalid_url" | "unsupported_protocol";
};

function parseHttpUrl(input: string): URL | null {
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function analyzeUrlList(raw: string): UrlListAnalysis {
  const inputs = raw
    .split(/[\r\n,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const validUrls: string[] = [];
  const invalidInputs: string[] = [];
  const seen = new Set<string>();
  const groups = new Map<string, string[]>();
  let duplicateCount = 0;

  for (const input of inputs) {
    const parsed = parseHttpUrl(input);
    if (!parsed) {
      invalidInputs.push(input);
      continue;
    }

    const normalizedUrl = parsed.toString();
    if (seen.has(normalizedUrl)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(normalizedUrl);
    validUrls.push(normalizedUrl);

    const group = groups.get(parsed.hostname) ?? [];
    group.push(normalizedUrl);
    groups.set(parsed.hostname, group);
  }

  return {
    inputCount: inputs.length,
    validUrls,
    invalidInputs,
    duplicateCount,
    hostGroups: Array.from(groups, ([host, urls]) => ({ host, urls })),
  };
}

export function chunkUrls(
  urls: string[],
  chunkSize = MAX_INDEXNOW_BATCH_SIZE,
  maxBytes = MAX_INDEXNOW_BATCH_BYTES
): string[][] {
  if (urls.length === 0) return [];
  const safeSize = Math.max(1, Math.floor(chunkSize));
  const safeBytes = Math.max(1024, Math.floor(maxBytes));
  const encoder = new TextEncoder();
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentBytes = 0;

  for (const url of urls) {
    const urlBytes = encoder.encode(url).byteLength + 1;
    if (
      current.length > 0 &&
      (current.length >= safeSize || currentBytes + urlBytes > safeBytes)
    ) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(url);
    currentBytes += urlBytes;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

/**
 * Extracts unique valid http(s) Sitemap URLs declared in a robots.txt body.
 */
export function parseRobotsTxtSitemaps(robotsTxt: string): string[] {
  const seen = new Set<string>();
  const sitemaps: string[] = [];

  for (const line of robotsTxt.split(/\r?\n/)) {
    const stripped = line.replace(/#.*$/, "").trim();
    const match = /^sitemap\s*:\s*(.+)$/i.exec(stripped);
    if (!match) continue;
    const parsed = parseHttpUrl(match[1].trim());
    if (!parsed) continue;
    const normalized = parsed.toString();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      sitemaps.push(normalized);
    }
  }

  return sitemaps;
}

const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
]);

function isTrackingParameter(name: string): boolean {
  return (
    name.toLowerCase().startsWith("utm_") ||
    TRACKING_PARAMETERS.has(name.toLowerCase())
  );
}

export function normalizeUrlList(
  raw: string,
  options: UrlNormalizationOptions
): NormalizedUrlResult[] {
  return raw
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((original) => {
      let url: URL;
      try {
        url = new URL(original);
      } catch {
        return { original, changes: [], error: "invalid_url" };
      }

      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return { original, changes: [], error: "unsupported_protocol" };
      }

      const changes: NormalizedUrlResult["changes"] = [];

      if (options.removeFragment && url.hash) {
        url.hash = "";
        changes.push("fragment_removed");
      }

      if (options.removeTrackingParameters) {
        const names = Array.from(url.searchParams.keys());
        const removed = names.filter(isTrackingParameter);
        removed.forEach((name) => url.searchParams.delete(name));
        if (removed.length > 0) changes.push("tracking_removed");
      }

      if (options.sortQueryParameters && url.search) {
        const before = url.search;
        url.searchParams.sort();
        if (url.search !== before) changes.push("query_sorted");
      }

      if (
        options.removeTrailingSlash &&
        url.pathname.length > 1 &&
        url.pathname.endsWith("/")
      ) {
        url.pathname = url.pathname.replace(/\/+$/, "");
        changes.push("trailing_slash_removed");
      }

      const normalized = url.toString();
      if (normalized !== original && changes.length === 0) {
        changes.push("canonicalized");
      }

      return { original, normalized, changes };
    });
}

function getElementsByLocalName(document: Document, localName: string): Element[] {
  const namespaced = Array.from(document.getElementsByTagNameNS("*", localName));
  return namespaced.length > 0
    ? namespaced
    : Array.from(document.getElementsByTagName(localName));
}

function getChildText(element: Element, localName: string): string | undefined {
  const child = Array.from(element.children).find(
    (candidate) =>
      candidate.localName === localName || candidate.nodeName === localName
  );
  const value = child?.textContent?.trim();
  return value || undefined;
}

function normalizeSitemapLocation(location: string): string | null {
  const parsed = parseHttpUrl(location.trim());
  return parsed?.toString() ?? null;
}

function decodeXmlEntities(raw: string): string {
  const unwrapped = raw
    .trim()
    .replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1")
    .trim();

  return unwrapped.replace(
    /&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g,
    (match, entity: string) => {
      switch (entity) {
        case "amp":
          return "&";
        case "lt":
          return "<";
        case "gt":
          return ">";
        case "quot":
          return '"';
        case "apos":
          return "'";
        default:
          if (entity.startsWith("#x") || entity.startsWith("#X")) {
            const code = parseInt(entity.slice(2), 16);
            return Number.isFinite(code) ? String.fromCodePoint(code) : match;
          }
          if (entity.startsWith("#")) {
            const code = parseInt(entity.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : match;
          }
          return match;
      }
    }
  );
}

function extractFirstTagText(block: string, localName: string): string | undefined {
  const regex = new RegExp(
    `<(?:[\\w-]+:)?${localName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${localName}>`,
    "i"
  );
  const match = regex.exec(block);
  if (!match) return undefined;
  const decoded = decodeXmlEntities(match[1]);
  return decoded || undefined;
}

/**
 * Pure-JS XML sitemap parser that runs identically in Node.js (Server Actions,
 * unit tests) and browsers. Supports namespaces, CDATA, XML entities,
 * `<urlset>`, and `<sitemapindex>`.
 */
export function parseSitemapXmlString(xml: string): SitemapParseResult {
  const cleaned = xml
    .replace(/^\uFEFF/, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();

  if (!cleaned || !cleaned.startsWith("<")) {
    return {
      type: "unsupported",
      entries: [],
      childSitemaps: [],
      invalidLocations: [],
      duplicateCount: 0,
      error: "invalid_xml",
    };
  }

  // Strip XML declaration / processing instructions / DOCTYPE to inspect root tag
  const withoutProlog = cleaned
    .replace(/^<\?xml[\s\S]*?\?>\s*/i, "")
    .replace(/^(?:<\?[\s\S]*?\?>\s*|<!DOCTYPE[\s\S]*?>\s*)*/i, "")
    .trim();

  const rootMatch = /^<((?:[\w-]+:)?([a-zA-Z_][\w.-]*))(?:\s[^>]*)?>/.exec(
    withoutProlog
  );
  if (!rootMatch) {
    return {
      type: "unsupported",
      entries: [],
      childSitemaps: [],
      invalidLocations: [],
      duplicateCount: 0,
      error: "invalid_xml",
    };
  }

  const fullRootTag = rootMatch[1];
  const rootLocalName = rootMatch[2].toLowerCase();
  const closingTagRegex = new RegExp(`</${fullRootTag}\\s*>\\s*$`, "i");
  const isSelfClosingRoot = /^<[^>]*\/>\s*$/.test(withoutProlog);

  if (!isSelfClosingRoot && !closingTagRegex.test(withoutProlog)) {
    return {
      type: "unsupported",
      entries: [],
      childSitemaps: [],
      invalidLocations: [],
      duplicateCount: 0,
      error: "invalid_xml",
    };
  }

  if (rootLocalName === "sitemapindex") {
    const blockRegex =
      /<(?:[\w-]+:)?sitemap(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?sitemap>/gi;
    const seen = new Set<string>();
    const childSitemaps: string[] = [];
    const invalidLocations: string[] = [];
    let duplicateCount = 0;

    let match: RegExpExecArray | null;
    while ((match = blockRegex.exec(withoutProlog)) !== null) {
      const loc = extractFirstTagText(match[1], "loc");
      if (!loc) {
        invalidLocations.push("");
        continue;
      }
      const normalized = normalizeSitemapLocation(loc);
      if (!normalized) {
        invalidLocations.push(loc);
        continue;
      }
      if (seen.has(normalized)) {
        duplicateCount += 1;
        continue;
      }
      seen.add(normalized);
      childSitemaps.push(normalized);
    }

    return {
      type: "index",
      entries: [],
      childSitemaps,
      invalidLocations,
      duplicateCount,
    };
  }

  if (rootLocalName !== "urlset") {
    return {
      type: "unsupported",
      entries: [],
      childSitemaps: [],
      invalidLocations: [],
      duplicateCount: 0,
    };
  }

  const urlBlockRegex =
    /<(?:[\w-]+:)?url(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?url>/gi;
  const entries = new Map<string, SitemapEntry>();
  const invalidLocations: string[] = [];
  let duplicateCount = 0;

  let match: RegExpExecArray | null;
  while ((match = urlBlockRegex.exec(withoutProlog)) !== null) {
    const block = match[1];
    const location = extractFirstTagText(block, "loc");
    if (!location) {
      invalidLocations.push("");
      continue;
    }

    const normalizedUrl = normalizeSitemapLocation(location);
    if (!normalizedUrl) {
      invalidLocations.push(location);
      continue;
    }

    if (entries.has(normalizedUrl)) {
      duplicateCount += 1;
      continue;
    }

    entries.set(normalizedUrl, {
      url: normalizedUrl,
      lastModified: extractFirstTagText(block, "lastmod"),
    });
  }

  return {
    type: "urlset",
    entries: Array.from(entries.values()),
    childSitemaps: [],
    invalidLocations,
    duplicateCount,
    error: entries.size === 0 ? "empty_urlset" : undefined,
  };
}

export function parseSitemapXml(xml: string): SitemapParseResult {
  if (typeof DOMParser === "undefined") {
    return parseSitemapXmlString(xml);
  }

  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.getElementsByTagName("parsererror").length > 0) {
    return {
      type: "unsupported",
      entries: [],
      childSitemaps: [],
      invalidLocations: [],
      duplicateCount: 0,
      error: "invalid_xml",
    };
  }

  const rootName = document.documentElement?.localName?.toLowerCase();
  if (rootName === "sitemapindex") {
    const seen = new Set<string>();
    const childSitemaps: string[] = [];
    const invalidLocations: string[] = [];
    let duplicateCount = 0;

    for (const element of getElementsByLocalName(document, "sitemap")) {
      const loc = getChildText(element, "loc");
      if (!loc) {
        invalidLocations.push("");
        continue;
      }
      const normalized = normalizeSitemapLocation(loc);
      if (!normalized) {
        invalidLocations.push(loc);
        continue;
      }
      if (seen.has(normalized)) {
        duplicateCount += 1;
        continue;
      }
      seen.add(normalized);
      childSitemaps.push(normalized);
    }

    return {
      type: "index",
      entries: [],
      childSitemaps,
      invalidLocations,
      duplicateCount,
    };
  }

  if (rootName !== "urlset") {
    return {
      type: "unsupported",
      entries: [],
      childSitemaps: [],
      invalidLocations: [],
      duplicateCount: 0,
    };
  }

  const entries = new Map<string, SitemapEntry>();
  const invalidLocations: string[] = [];
  let duplicateCount = 0;

  for (const element of getElementsByLocalName(document, "url")) {
    const location = getChildText(element, "loc");
    if (!location) {
      invalidLocations.push("");
      continue;
    }

    const normalizedUrl = normalizeSitemapLocation(location);
    if (!normalizedUrl) {
      invalidLocations.push(location);
      continue;
    }

    if (entries.has(normalizedUrl)) {
      duplicateCount += 1;
      continue;
    }

    entries.set(normalizedUrl, {
      url: normalizedUrl,
      lastModified: getChildText(element, "lastmod"),
    });
  }

  return {
    type: "urlset",
    entries: Array.from(entries.values()),
    childSitemaps: [],
    invalidLocations,
    duplicateCount,
    error: entries.size === 0 ? "empty_urlset" : undefined,
  };
}

export function diffSitemapEntries(
  previousEntries: SitemapEntry[],
  currentEntries: SitemapEntry[]
): SitemapDiff {
  const previousByUrl = new Map(
    previousEntries.map((entry) => [entry.url, entry])
  );
  const currentUrls = new Set<string>();
  const added: SitemapEntry[] = [];
  const changed: SitemapEntry[] = [];
  const removed: SitemapEntry[] = [];
  let unchangedCount = 0;

  for (const entry of currentEntries) {
    currentUrls.add(entry.url);
    const previous = previousByUrl.get(entry.url);
    if (!previous) {
      added.push(entry);
      continue;
    }

    if (previous.lastModified !== entry.lastModified) {
      changed.push(entry);
      continue;
    }

    unchangedCount += 1;
  }

  for (const entry of previousEntries) {
    if (!currentUrls.has(entry.url)) {
      removed.push(entry);
    }
  }

  return { added, changed, removed, unchangedCount };
}

export function filterSitemapEntriesByLastMod(
  entries: SitemapEntry[],
  maxAgeDays: number | null,
  now: Date = new Date()
): SitemapLastModFilterResult {
  if (maxAgeDays === null || maxAgeDays <= 0) {
    return {
      matched: entries,
      withoutLastModCount: 0,
      olderCount: 0,
    };
  }

  const nowMs = now.getTime();
  const cutoffMs = nowMs - maxAgeDays * 24 * 60 * 60 * 1000;
  // Allow up to 24h future clock skew for date-only ISO strings (e.g. 2026-11-25)
  const upperBoundMs = nowMs + 24 * 60 * 60 * 1000;

  const matched: SitemapEntry[] = [];
  let withoutLastModCount = 0;
  let olderCount = 0;

  for (const entry of entries) {
    if (!entry.lastModified) {
      withoutLastModCount += 1;
      continue;
    }

    const parsedMs = Date.parse(entry.lastModified);
    if (Number.isNaN(parsedMs)) {
      withoutLastModCount += 1;
      continue;
    }

    if (parsedMs >= cutoffMs && parsedMs <= upperBoundMs) {
      matched.push(entry);
    } else {
      olderCount += 1;
    }
  }

  return { matched, withoutLastModCount, olderCount };
}

export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    const didCopy = document.execCommand("copy");
    textArea.remove();
    return didCopy;
  }
}

export function downloadTextFile(
  filename: string,
  contents: string,
  mimeType = "text/plain;charset=utf-8"
): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function generateIndexNowKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}
