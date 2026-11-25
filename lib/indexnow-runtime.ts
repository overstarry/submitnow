import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {
  resolveIndexNowEndpoint,
  validateKeyLocationScope,
  type IndexNowEndpointId,
} from './indexnow-endpoints.ts';
import { safeFetch, SafeFetchError } from './safe-fetch.ts';
import {
  analyzeUrlList,
  chunkUrls,
  filterSitemapEntriesByLastMod,
  MAX_INDEXNOW_BATCH_SIZE,
  parseRobotsTxtSitemaps,
  parseSitemapXmlString,
  type SitemapEntry,
} from './seo-tools.ts';

const KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;
const MAX_KEY_BODY_BYTES = 4096;
const MAX_ROBOTS_BYTES = 512 * 1024;
const MAX_SITEMAP_DOWNLOAD_BYTES = 10 * 1024 * 1024;
const MAX_SITEMAP_DECOMPRESSED_BYTES = 25 * 1024 * 1024;
const CHILD_CONCURRENCY = 4;

export type RuntimeKeyCheckIssue =
  | 'not_found'
  | 'http_error'
  | 'redirected_off_host'
  | 'key_mismatch'
  | 'empty_body'
  | 'html_response'
  | 'byte_order_mark'
  | 'body_too_large';

export type RuntimeKeyCheckErrorCode =
  | 'invalid_host'
  | 'invalid_key'
  | 'invalid_key_location'
  | 'blocked_url'
  | 'fetch_failed'
  | 'timeout';

export type RuntimeSitemapErrorCode =
  | 'invalid_url'
  | 'blocked_url'
  | 'http_error'
  | 'invalid_xml'
  | 'empty_sitemap'
  | 'response_too_large'
  | 'timeout'
  | 'fetch_failed';

export type RuntimeSubmitErrorCode =
  | 'invalid_key'
  | 'invalid_host'
  | 'invalid_key_location'
  | 'key_location_protocol_mismatch'
  | 'key_location_scope_mismatch'
  | 'invalid_urls'
  | 'mixed_hosts'
  | 'host_mismatch'
  | 'too_many_urls'
  | 'bing_invalid_request'
  | 'bing_invalid_key'
  | 'bing_invalid_url_list'
  | 'bing_rate_limited'
  | 'bing_error'
  | 'network_error'
  | 'timeout';

export function generateSecureKey(): string {
  return crypto.randomBytes(24).toString('hex');
}

function normalizeKeyInput(rawKey: string): string {
  const trimmed = rawKey.trim();
  return trimmed.toLowerCase().endsWith('.txt')
    ? trimmed.slice(0, -4)
    : trimmed;
}

function normalizeHostInput(rawHost: string): string | null {
  const trimmed = rawHost.trim();
  if (!trimmed) return null;
  try {
    const parsed =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? new URL(trimmed)
        : new URL(`https://${trimmed}`);
    return parsed.hostname || null;
  } catch {
    return null;
  }
}

export type RuntimeKeyCheckResult =
  | {
      ok: true;
      valid: boolean;
      keyLocation: string;
      finalUrl: string;
      status: number;
      contentType: string | null;
      body: string;
      issues: RuntimeKeyCheckIssue[];
    }
  | {
      ok: false;
      errorCode: RuntimeKeyCheckErrorCode;
      message: string;
    };

export async function verifyRemoteKeyFile(input: {
  host: string;
  key: string;
  keyLocation?: string;
}): Promise<RuntimeKeyCheckResult> {
  const key = normalizeKeyInput(input.key);
  if (!KEY_PATTERN.test(key)) {
    return {
      ok: false,
      errorCode: 'invalid_key',
      message: 'Key must be 8–128 characters using letters, numbers, and dashes.',
    };
  }

  const host = normalizeHostInput(input.host);
  if (!host) {
    return {
      ok: false,
      errorCode: 'invalid_host',
      message: 'Host must be a valid domain name.',
    };
  }

  let keyLocation: URL;
  if (input.keyLocation?.trim()) {
    try {
      keyLocation = new URL(input.keyLocation.trim());
    } catch {
      return {
        ok: false,
        errorCode: 'invalid_key_location',
        message: 'Key location must be a valid http(s) URL.',
      };
    }
    if (
      (keyLocation.protocol !== 'http:' && keyLocation.protocol !== 'https:') ||
      keyLocation.hostname !== host
    ) {
      return {
        ok: false,
        errorCode: 'invalid_key_location',
        message: 'Key location must use http(s) on the same host.',
      };
    }
  } else {
    keyLocation = new URL(`https://${host}/${key}.txt`);
  }

  try {
    const response = await safeFetch(keyLocation, {
      timeoutMs: 8000,
      maxBytes: MAX_KEY_BODY_BYTES,
      maxRedirects: 5,
      accept: 'text/plain, */*',
      allowTruncate: true,
    });

    const issues: RuntimeKeyCheckIssue[] = [];
    if (response.status === 404) {
      issues.push('not_found');
    } else if (!response.ok) {
      issues.push('http_error');
    }

    if (new URL(response.finalUrl).hostname !== host) {
      issues.push('redirected_off_host');
    }

    const { bytes, truncated } = response;
    const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
    if (truncated) issues.push('body_too_large');

    const raw = new TextDecoder('utf-8').decode(bytes);
    const body = raw.replace(/^\uFEFF/, '').trim();

    if (response.ok) {
      if (hasBom) issues.push('byte_order_mark');
      if (!body) {
        issues.push('empty_body');
      } else if (/^<(!doctype|html)/i.test(body)) {
        issues.push('html_response');
      } else if (body !== key) {
        issues.push('key_mismatch');
      }
    }

    return {
      ok: true,
      valid: issues.length === 0,
      keyLocation: keyLocation.toString(),
      finalUrl: response.finalUrl,
      status: response.status,
      contentType: response.headers.get('content-type'),
      body: body.slice(0, 200),
      issues,
    };
  } catch (error) {
    if (error instanceof SafeFetchError) {
      if (error.code === 'blocked_url') {
        return { ok: false, errorCode: 'blocked_url', message: error.message };
      }
      if (error.code === 'timeout') {
        return { ok: false, errorCode: 'timeout', message: error.message };
      }
    }
    return {
      ok: false,
      errorCode: 'fetch_failed',
      message: 'Failed to fetch key file.',
    };
  }
}

export type RuntimeSitemapResult =
  | {
      ok: true;
      sourceUrl: string;
      fetchedSitemapsCount: number;
      childSitemapsFound: number;
      failedSitemapsCount: number;
      duplicateCount: number;
      invalidLocationsCount: number;
      totalExtractedCount: number;
      entries: SitemapEntry[];
      filteredOutByLastModCount: number;
      withoutLastModCount: number;
      truncatedBySitemapLimit: boolean;
      truncatedByUrlLimit: boolean;
    }
  | {
      ok: false;
      errorCode: RuntimeSitemapErrorCode;
      message: string;
      status?: number;
    };

function normalizeSitemapInputUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withScheme =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
    const url = new URL(withScheme);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function isRootDomainUrl(url: URL): boolean {
  return (url.pathname === '/' || url.pathname === '') && !url.search;
}

function decodeSitemapBytes(bytes: Uint8Array): string {
  const isGzip = bytes.byteLength >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (isGzip) {
    const gunzipped = zlib.gunzipSync(bytes, {
      maxOutputLength: MAX_SITEMAP_DECOMPRESSED_BYTES,
    });
    return new TextDecoder('utf-8').decode(gunzipped);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

/**
 * Discovers candidate sitemap URLs when a caller passes a bare domain/origin
 * (e.g. `example.com` or `https://example.com/`): checks `robots.txt` for
 * `Sitemap:` lines first, then falls back to `/sitemap_index.xml` and `/sitemap.xml`.
 */
async function discoverRootSitemaps(
  originUrl: URL,
  remainingMs: number
): Promise<
  | { ok: true; candidates: string[]; viaRobots: boolean }
  | { ok: false; errorCode: RuntimeSitemapErrorCode; message: string }
> {
  const robotsUrl = new URL('/robots.txt', originUrl);
  try {
    const res = await safeFetch(robotsUrl, {
      timeoutMs: Math.min(6_000, Math.max(1_000, remainingMs)),
      maxBytes: MAX_ROBOTS_BYTES,
      maxRedirects: 5,
      accept: 'text/plain, */*',
      allowTruncate: true,
    });
    if (res.ok) {
      const text = new TextDecoder('utf-8').decode(res.bytes);
      const declared = parseRobotsTxtSitemaps(text);
      if (declared.length > 0) {
        return { ok: true, candidates: declared, viaRobots: true };
      }
    }
  } catch (error) {
    if (error instanceof SafeFetchError && error.code === 'blocked_url') {
      return { ok: false, errorCode: 'blocked_url', message: error.message };
    }
  }

  return {
    ok: true,
    candidates: [
      new URL('/sitemap_index.xml', originUrl).toString(),
      new URL('/sitemap.xml', originUrl).toString(),
    ],
    viaRobots: false,
  };
}

export async function fetchRemoteSitemapEntries(input: {
  url: string;
  maxAgeDays?: number | null;
  maxChildSitemaps?: number;
  maxUrls?: number;
  deadlineMs?: number;
}): Promise<RuntimeSitemapResult> {
  const maxChildSitemaps = Math.min(Math.max(1, input.maxChildSitemaps ?? 20), 50);
  const maxUrls = Math.min(Math.max(1, input.maxUrls ?? 50_000), 100_000);
  const deadline = Date.now() + (input.deadlineMs ?? 22_000);

  const parsedInput = normalizeSitemapInputUrl(input.url);
  if (!parsedInput) {
    return {
      ok: false,
      errorCode: 'invalid_url',
      message: 'Provide a valid http(s) sitemap URL or domain.',
    };
  }

  const fetchOne = async (
    target: URL
  ): Promise<
    | {
        ok: true;
        finalUrl: string;
        parsed: ReturnType<typeof parseSitemapXmlString>;
      }
    | { ok: false; errorCode: RuntimeSitemapErrorCode; status?: number }
  > => {
    const remaining = deadline - Date.now();
    if (remaining <= 500) {
      return { ok: false, errorCode: 'timeout' };
    }
    try {
      const res = await safeFetch(target, {
        timeoutMs: Math.min(10_000, remaining),
        maxBytes: MAX_SITEMAP_DOWNLOAD_BYTES,
        maxRedirects: 5,
        accept: 'application/xml, text/xml, application/gzip, */*',
      });
      if (!res.ok) {
        return { ok: false, errorCode: 'http_error', status: res.status };
      }
      let xml: string;
      try {
        xml = decodeSitemapBytes(res.bytes);
      } catch {
        return { ok: false, errorCode: 'response_too_large' };
      }
      const parsed = parseSitemapXmlString(xml);
      if (parsed.error === 'invalid_xml' || parsed.type === 'unsupported') {
        return { ok: false, errorCode: 'invalid_xml' };
      }
      return { ok: true, finalUrl: res.finalUrl, parsed };
    } catch (error) {
      if (error instanceof SafeFetchError) {
        if (error.code === 'blocked_url') {
          return { ok: false, errorCode: 'blocked_url' };
        }
        if (error.code === 'timeout') {
          return { ok: false, errorCode: 'timeout' };
        }
        if (error.code === 'response_too_large') {
          return { ok: false, errorCode: 'response_too_large' };
        }
      }
      return { ok: false, errorCode: 'fetch_failed' };
    }
  };

  const entriesByUrl = new Map<string, SitemapEntry>();
  const visitedSitemaps = new Set<string>();
  const queue: { url: string; depth: number }[] = [];
  let sourceUrl = parsedInput.toString();
  let duplicateCount = 0;
  let invalidLocationsCount = 0;
  let fetchedSitemapsCount = 0;
  let childSitemapsFound = 0;
  let failedSitemapsCount = 0;
  let truncatedBySitemapLimit = false;
  let truncatedByUrlLimit = false;

  const addEntries = (items: SitemapEntry[]) => {
    for (const item of items) {
      if (entriesByUrl.has(item.url)) {
        duplicateCount += 1;
        continue;
      }
      if (entriesByUrl.size >= maxUrls) {
        truncatedByUrlLimit = true;
        break;
      }
      entriesByUrl.set(item.url, item);
    }
  };

  const enqueueChildren = (urls: string[], depth: number) => {
    for (const childUrl of urls) {
      if (visitedSitemaps.has(childUrl)) continue;
      visitedSitemaps.add(childUrl);
      childSitemapsFound += 1;
      if (queue.length >= maxChildSitemaps) {
        truncatedBySitemapLimit = true;
        continue;
      }
      queue.push({ url: childUrl, depth });
    }
  };

  if (isRootDomainUrl(parsedInput)) {
    const discovered = await discoverRootSitemaps(
      parsedInput,
      deadline - Date.now()
    );
    if (!discovered.ok) {
      return discovered;
    }

    if (discovered.viaRobots) {
      sourceUrl = new URL('/robots.txt', parsedInput).toString();
      enqueueChildren(discovered.candidates, 1);
    } else {
      // Probe common fallback locations until one valid sitemap succeeds
      let lastFailure: { errorCode: RuntimeSitemapErrorCode; status?: number } = {
        errorCode: 'fetch_failed',
      };
      let foundRoot = false;
      for (const candidate of discovered.candidates) {
        const res = await fetchOne(new URL(candidate));
        if (res.ok) {
          foundRoot = true;
          sourceUrl = res.finalUrl;
          visitedSitemaps.add(res.finalUrl);
          fetchedSitemapsCount += 1;
          duplicateCount += res.parsed.duplicateCount;
          invalidLocationsCount += res.parsed.invalidLocations.length;
          if (res.parsed.type === 'urlset') {
            addEntries(res.parsed.entries);
          } else if (res.parsed.type === 'index') {
            enqueueChildren(res.parsed.childSitemaps, 1);
          }
          break;
        }
        lastFailure = { errorCode: res.errorCode, status: res.status };
        if (res.errorCode === 'blocked_url') break;
      }

      if (!foundRoot) {
        return {
          ok: false,
          errorCode: lastFailure.errorCode,
          status: lastFailure.status,
          message: `Could not discover a sitemap (${lastFailure.errorCode}).`,
        };
      }
    }
  } else {
    const rootFetch = await fetchOne(parsedInput);
    if (!rootFetch.ok) {
      return {
        ok: false,
        errorCode: rootFetch.errorCode,
        status: rootFetch.status,
        message: `Failed to read sitemap (${rootFetch.errorCode}).`,
      };
    }

    sourceUrl = rootFetch.finalUrl;
    visitedSitemaps.add(rootFetch.finalUrl);
    fetchedSitemapsCount = 1;
    duplicateCount += rootFetch.parsed.duplicateCount;
    invalidLocationsCount += rootFetch.parsed.invalidLocations.length;

    if (rootFetch.parsed.type === 'urlset') {
      addEntries(rootFetch.parsed.entries);
    } else if (rootFetch.parsed.type === 'index') {
      enqueueChildren(rootFetch.parsed.childSitemaps, 1);
    }
  }

  if (queue.length > 0) {
    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        if (truncatedByUrlLimit || Date.now() >= deadline - 500) break;
        const item = queue[cursor];
        cursor += 1;
        const childUrl = normalizeSitemapInputUrl(item.url);
        if (!childUrl) {
          failedSitemapsCount += 1;
          continue;
        }

        const childRes = await fetchOne(childUrl);
        if (!childRes.ok) {
          failedSitemapsCount += 1;
          continue;
        }

        fetchedSitemapsCount += 1;
        duplicateCount += childRes.parsed.duplicateCount;
        invalidLocationsCount += childRes.parsed.invalidLocations.length;

        if (childRes.parsed.type === 'urlset') {
          addEntries(childRes.parsed.entries);
        } else if (childRes.parsed.type === 'index' && item.depth < 2) {
          enqueueChildren(childRes.parsed.childSitemaps, item.depth + 1);
        }
      }
    };

    const workerCount = Math.min(CHILD_CONCURRENCY, queue.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
  }

  const allEntries = Array.from(entriesByUrl.values());
  if (allEntries.length === 0) {
    return {
      ok: false,
      errorCode: 'empty_sitemap',
      message: 'No valid http(s) URLs found in sitemap.',
    };
  }

  const filtered = filterSitemapEntriesByLastMod(
    allEntries,
    input.maxAgeDays ?? null
  );

  return {
    ok: true,
    sourceUrl,
    fetchedSitemapsCount,
    childSitemapsFound,
    failedSitemapsCount,
    duplicateCount,
    invalidLocationsCount,
    totalExtractedCount: allEntries.length,
    entries: filtered.matched,
    filteredOutByLastModCount: filtered.olderCount,
    withoutLastModCount: filtered.withoutLastModCount,
    truncatedBySitemapLimit,
    truncatedByUrlLimit,
  };
}

export type RuntimeSubmitResult =
  | {
      ok: true;
      dryRun: boolean;
      endpointId: IndexNowEndpointId;
      endpointName: string;
      endpointUrl: string;
      host: string;
      keyLocation: string;
      submittedCount: number;
      status: number;
      batches: { index: number; count: number; status: number }[];
    }
  | {
      ok: false;
      errorCode: RuntimeSubmitErrorCode;
      message: string;
      details?: Record<string, unknown>;
    };

function mapHttpStatusToErrorCode(status: number): RuntimeSubmitErrorCode {
  switch (status) {
    case 400:
      return 'bing_invalid_request';
    case 403:
      return 'bing_invalid_key';
    case 422:
      return 'bing_invalid_url_list';
    case 429:
      return 'bing_rate_limited';
    default:
      return 'bing_error';
  }
}

export async function submitIndexNowBatches(input: {
  urls: string[];
  key: string;
  host?: string;
  keyLocation?: string;
  endpointId?: string;
  dryRun?: boolean;
  /** When true, rejects > 10,000 URLs instead of auto-splitting (used by single-batch Server Action). */
  enforceSingleBatch?: boolean;
}): Promise<RuntimeSubmitResult> {
  const key = normalizeKeyInput(input.key);
  if (!KEY_PATTERN.test(key)) {
    return {
      ok: false,
      errorCode: 'invalid_key',
      message: 'Key must be 8–128 characters using letters, numbers, and dashes.',
    };
  }

  const analysis = analyzeUrlList(input.urls.join('\n'));
  if (analysis.invalidInputs.length > 0) {
    return {
      ok: false,
      errorCode: 'invalid_urls',
      message: `Invalid URL found: ${analysis.invalidInputs[0]}`,
      details: { invalidUrl: analysis.invalidInputs[0] },
    };
  }
  if (analysis.validUrls.length === 0) {
    return {
      ok: false,
      errorCode: 'invalid_urls',
      message: 'Provide at least one valid http(s) URL.',
    };
  }
  if (
    input.enforceSingleBatch &&
    analysis.validUrls.length > MAX_INDEXNOW_BATCH_SIZE
  ) {
    return {
      ok: false,
      errorCode: 'too_many_urls',
      message: `Too many URLs (${analysis.validUrls.length}). Max is ${MAX_INDEXNOW_BATCH_SIZE} per request.`,
      details: { max: MAX_INDEXNOW_BATCH_SIZE, got: analysis.validUrls.length },
    };
  }
  if (analysis.hostGroups.length !== 1) {
    return {
      ok: false,
      errorCode: 'mixed_hosts',
      message: 'All URLs in one submission must belong to the same host.',
      details: { hosts: analysis.hostGroups.map((g) => g.host).slice(0, 10) },
    };
  }

  const parsedUrls = analysis.validUrls.map((raw) => new URL(raw));
  const derivedHost = parsedUrls[0].hostname;
  const providedHost = input.host ? normalizeHostInput(input.host) : null;
  if (input.host && !providedHost) {
    return {
      ok: false,
      errorCode: 'invalid_host',
      message: 'Provided host is invalid.',
    };
  }
  if (providedHost && providedHost !== derivedHost) {
    return {
      ok: false,
      errorCode: 'host_mismatch',
      message: `Host ${providedHost} does not match URL host ${derivedHost}.`,
      details: { derivedHost, providedHost },
    };
  }

  const host = providedHost ?? derivedHost;
  let keyLocationUrl: URL;
  if (input.keyLocation?.trim()) {
    try {
      keyLocationUrl = new URL(input.keyLocation.trim());
    } catch {
      return {
        ok: false,
        errorCode: 'invalid_key_location',
        message: 'Key location must be a valid http(s) URL.',
      };
    }
  } else {
    const safeProto = parsedUrls[0].protocol === 'http:' ? 'http:' : 'https:';
    keyLocationUrl = new URL(`${safeProto}//${host}/${key}.txt`);
  }

  const scope = validateKeyLocationScope(keyLocationUrl, host, parsedUrls);
  if (!scope.valid) {
    return {
      ok: false,
      errorCode:
        scope.reason === 'subdirectory_mismatch'
          ? 'key_location_scope_mismatch'
          : scope.reason === 'protocol_mismatch'
            ? 'key_location_protocol_mismatch'
            : 'invalid_key_location',
      message: `Key location scope validation failed (${scope.reason}).`,
      details: {
        keyProtocol: keyLocationUrl.protocol,
        directoryPrefix: scope.directoryPrefix,
        invalidUrl: scope.invalidUrl,
      },
    };
  }

  const endpoint = resolveIndexNowEndpoint(input.endpointId);
  const chunks = input.enforceSingleBatch
    ? [analysis.validUrls]
    : chunkUrls(analysis.validUrls, MAX_INDEXNOW_BATCH_SIZE);
  const batchResults: { index: number; count: number; status: number }[] = [];

  if (input.dryRun) {
    for (let i = 0; i < chunks.length; i += 1) {
      batchResults.push({ index: i + 1, count: chunks[i].length, status: 0 });
    }
    return {
      ok: true,
      dryRun: true,
      endpointId: endpoint.id,
      endpointName: endpoint.name,
      endpointUrl: endpoint.url,
      host,
      keyLocation: keyLocationUrl.toString(),
      submittedCount: analysis.validUrls.length,
      status: 0,
      batches: batchResults,
    };
  }

  let lastStatus = 200;
  for (let i = 0; i < chunks.length; i += 1) {
    const payload = {
      host,
      key,
      keyLocation: keyLocationUrl.toString(),
      urlList: chunks[i],
    };

    let response: Response;
    try {
      response = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      return {
        ok: false,
        errorCode:
          error instanceof DOMException && error.name === 'TimeoutError'
            ? 'timeout'
            : 'network_error',
        message:
          error instanceof Error ? error.message : 'IndexNow request failed.',
        details: { failedBatch: i + 1, totalBatches: chunks.length },
      };
    }

    if (!response.ok) {
      const bodyPreview = await response.text().catch(() => '');
      return {
        ok: false,
        errorCode: mapHttpStatusToErrorCode(response.status),
        message: `Endpoint returned HTTP ${response.status} on batch ${i + 1}/${chunks.length}.`,
        details: {
          status: response.status,
          endpointName: endpoint.name,
          failedBatch: i + 1,
          totalBatches: chunks.length,
          bodyPreview: bodyPreview.slice(0, 500),
        },
      };
    }

    lastStatus = response.status;
    batchResults.push({
      index: i + 1,
      count: chunks[i].length,
      status: response.status,
    });
  }

  return {
    ok: true,
    dryRun: false,
    endpointId: endpoint.id,
    endpointName: endpoint.name,
    endpointUrl: endpoint.url,
    host,
    keyLocation: keyLocationUrl.toString(),
    submittedCount: analysis.validUrls.length,
    status: lastStatus,
    batches: batchResults,
  };
}
