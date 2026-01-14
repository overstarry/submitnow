'use server';

import { z } from 'zod';

const BING_INDEXNOW_ENDPOINT = 'https://www.bing.com/indexnow';

export type IndexNowErrorCode =
  | 'invalid_form'
  | 'invalid_key'
  | 'invalid_host'
  | 'invalid_key_location'
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

export type SubmitIndexNowResult =
  | {
      success: true;
      status: number;
      submittedCount: number;
      host: string;
      keyLocation: string;
    }
  | {
      success: false;
      errorCode: IndexNowErrorCode;
      message?: string;
      details?: Record<string, unknown>;
    };

const submitSchema = z.object({
  key: z.string().trim().min(8).max(128),
  urls: z.string().trim().min(1),
  host: z.string().trim().optional(),
  keyLocation: z.string().trim().optional(),
});

function normalizeKey(rawKey: string): string {
  const key = rawKey.trim();
  return key.toLowerCase().endsWith('.txt') ? key.slice(0, -4) : key;
}

function normalizeHost(rawHost: string): string | null {
  const input = rawHost.trim();
  if (!input) return null;

  try {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return new URL(input).hostname;
    }
    return new URL(`https://${input}`).hostname;
  } catch {
    return null;
  }
}

function parseUrlList(raw: string): string[] {
  const parts = raw
    .split(/[\r\n,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const unique = new Set<string>();
  for (const part of parts) unique.add(part);
  return Array.from(unique);
}

function parseHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

function buildDefaultKeyLocation(host: string, key: string): string {
  return `https://${host}/${key}.txt`;
}

function normalizeErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  return undefined;
}

export async function submitIndexNow(formData: FormData): Promise<SubmitIndexNowResult> {
  const parsed = submitSchema.safeParse({
    key: String(formData.get('key') ?? ''),
    urls: String(formData.get('urls') ?? ''),
    host: String(formData.get('host') ?? '').trim() || undefined,
    keyLocation: String(formData.get('keyLocation') ?? '').trim() || undefined,
  });

  if (!parsed.success) {
    return { success: false, errorCode: 'invalid_form' };
  }

  const key = normalizeKey(parsed.data.key);
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) {
    return { success: false, errorCode: 'invalid_key' };
  }

  const urls = parseUrlList(parsed.data.urls);
  if (urls.length === 0) {
    return { success: false, errorCode: 'invalid_urls' };
  }
  if (urls.length > 10_000) {
    return {
      success: false,
      errorCode: 'too_many_urls',
      details: { max: 10_000, got: urls.length },
    };
  }

  const parsedUrls: URL[] = [];
  const hostnames = new Set<string>();
  for (const rawUrl of urls) {
    const url = parseHttpUrl(rawUrl);
    if (!url) {
      return {
        success: false,
        errorCode: 'invalid_urls',
        details: { invalidUrl: rawUrl },
      };
    }
    hostnames.add(url.hostname);
    parsedUrls.push(url);
  }

  if (hostnames.size !== 1) {
    return {
      success: false,
      errorCode: 'mixed_hosts',
      details: { hosts: Array.from(hostnames).slice(0, 10) },
    };
  }

  const derivedHost = parsedUrls[0].hostname;
  const providedHost = parsed.data.host ? normalizeHost(parsed.data.host) : null;

  if (parsed.data.host && !providedHost) {
    return { success: false, errorCode: 'invalid_host' };
  }

  const host = providedHost ?? derivedHost;
  if (providedHost && providedHost !== derivedHost) {
    return {
      success: false,
      errorCode: 'host_mismatch',
      details: { derivedHost, providedHost },
    };
  }

  const keyLocation = (() => {
    if (!parsed.data.keyLocation) return buildDefaultKeyLocation(host, key);
    const url = parseHttpUrl(parsed.data.keyLocation);
    if (!url) return null;
    if (url.hostname !== host) return null;
    return url.toString();
  })();

  if (!keyLocation) {
    return { success: false, errorCode: 'invalid_key_location' };
  }

  const payload = {
    host,
    key,
    keyLocation,
    urlList: parsedUrls.map((u) => u.toString()),
  };

  let response: Response;
  try {
    response = await fetch(BING_INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return { success: false, errorCode: 'timeout' };
    }
    return {
      success: false,
      errorCode: 'network_error',
      message: normalizeErrorMessage(error),
    };
  }

  if (response.ok) {
    return {
      success: true,
      status: response.status,
      submittedCount: payload.urlList.length,
      host,
      keyLocation,
    };
  }

  const bodyPreview = await response.text().catch(() => '');
  const errorCode: IndexNowErrorCode = (() => {
    switch (response.status) {
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
  })();
  return {
    success: false,
    errorCode,
    details: {
      status: response.status,
      bodyPreview: bodyPreview.slice(0, 500),
    },
  };
}
