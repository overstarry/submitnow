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
  unchangedCount: number;
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

function getElementsByLocalName(document: Document, localName: string): Element[] {
  const namespaced = Array.from(document.getElementsByTagNameNS("*", localName));
  return namespaced.length > 0
    ? namespaced
    : Array.from(document.getElementsByTagName(localName));
}

function getChildText(element: Element, localName: string): string | undefined {
  const child = Array.from(element.children).find(
    (candidate) => candidate.localName === localName || candidate.nodeName === localName
  );
  const value = child?.textContent?.trim();
  return value || undefined;
}

function normalizeSitemapLocation(location: string): string | null {
  const parsed = parseHttpUrl(location.trim());
  return parsed?.toString() ?? null;
}

export function parseSitemapXml(xml: string): SitemapParseResult {
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

  const rootName = document.documentElement?.localName;
  if (rootName === "sitemapindex") {
    const childSitemaps = getElementsByLocalName(document, "sitemap")
      .map((element) => getChildText(element, "loc"))
      .filter((location): location is string => Boolean(location))
      .map(normalizeSitemapLocation)
      .filter((location): location is string => Boolean(location));

    return {
      type: "index",
      entries: [],
      childSitemaps,
      invalidLocations: [],
      duplicateCount: 0,
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
  const added: SitemapEntry[] = [];
  const changed: SitemapEntry[] = [];
  let unchangedCount = 0;

  for (const entry of currentEntries) {
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

  return { added, changed, unchangedCount };
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

export function downloadTextFile(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function generateIndexNowKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
