'use server';

import { z } from 'zod';

const REQUEST_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 4096;

export type KeyCheckErrorCode =
  | 'invalid_form'
  | 'invalid_host'
  | 'invalid_key'
  | 'invalid_key_location'
  | 'fetch_failed'
  | 'timeout';

export type KeyCheckIssue =
  | 'not_found'
  | 'http_error'
  | 'redirected_off_host'
  | 'key_mismatch'
  | 'empty_body'
  | 'html_response'
  | 'byte_order_mark'
  | 'body_too_large';

export type KeyCheckResult =
  | {
      success: true;
      /** True only when the file is reachable and its content matches the key. */
      valid: boolean;
      keyLocation: string;
      finalUrl: string;
      status: number;
      contentType: string | null;
      /** Trimmed body, truncated for display. Empty when the request failed. */
      body: string;
      issues: KeyCheckIssue[];
    }
  | {
      success: false;
      errorCode: KeyCheckErrorCode;
    };

const checkSchema = z.object({
  key: z.string().trim().min(1),
  host: z.string().trim().min(1),
  keyLocation: z.string().trim(),
});

/** FormData.get() yields null for a field the form never rendered. */
function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

const KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;

function normalizeKey(rawKey: string): string {
  const key = rawKey.trim();
  return key.toLowerCase().endsWith('.txt') ? key.slice(0, -4) : key;
}

function normalizeHost(rawHost: string): string | null {
  const input = rawHost.trim();
  if (!input) return null;

  try {
    const url =
      input.startsWith('http://') || input.startsWith('https://')
        ? new URL(input)
        : new URL(`https://${input}`);
    return url.hostname || null;
  } catch {
    return null;
  }
}

export async function checkIndexNowKey(
  formData: FormData
): Promise<KeyCheckResult> {
  const parsed = checkSchema.safeParse({
    key: field(formData, 'key'),
    host: field(formData, 'host'),
    keyLocation: field(formData, 'keyLocation'),
  });

  if (!parsed.success) {
    return { success: false, errorCode: 'invalid_form' };
  }

  const key = normalizeKey(parsed.data.key);
  if (!KEY_PATTERN.test(key)) {
    return { success: false, errorCode: 'invalid_key' };
  }

  const host = normalizeHost(parsed.data.host);
  if (!host) {
    return { success: false, errorCode: 'invalid_host' };
  }

  let keyLocation: URL;
  if (parsed.data.keyLocation) {
    try {
      keyLocation = new URL(parsed.data.keyLocation);
    } catch {
      return { success: false, errorCode: 'invalid_key_location' };
    }

    if (!['http:', 'https:'].includes(keyLocation.protocol)) {
      return { success: false, errorCode: 'invalid_key_location' };
    }
    // IndexNow only accepts a key file served from the host being submitted,
    // so refusing a foreign host here mirrors what the search engine does.
    if (keyLocation.hostname !== host) {
      return { success: false, errorCode: 'invalid_key_location' };
    }
  } else {
    keyLocation = new URL(`https://${host}/${key}.txt`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(keyLocation, {
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'text/plain, */*' },
    });

    const issues: KeyCheckIssue[] = [];
    const contentType = response.headers.get('content-type');
    const finalUrl = response.url || keyLocation.toString();

    if (response.status === 404) {
      issues.push('not_found');
    } else if (!response.ok) {
      issues.push('http_error');
    }

    if (new URL(finalUrl).hostname !== host) {
      issues.push('redirected_off_host');
    }

    // Read bytes rather than text(): the decoder silently strips a UTF-8 BOM,
    // which would hide a file whose bytes do not equal the key.
    const bytes = new Uint8Array(await response.arrayBuffer());
    const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;

    if (bytes.byteLength > MAX_BODY_BYTES) {
      issues.push('body_too_large');
    }

    const raw = new TextDecoder('utf-8').decode(bytes.slice(0, MAX_BODY_BYTES));
    const body = raw.replace(/^﻿/, '').trim();

    if (response.ok) {
      if (hasBom) {
        issues.push('byte_order_mark');
      }
      if (!body) {
        issues.push('empty_body');
      } else if (/^<(!doctype|html)/i.test(body)) {
        // A soft 404 usually answers 200 with the site's HTML shell.
        issues.push('html_response');
      } else if (normalizeKey(body) !== key) {
        issues.push('key_mismatch');
      }
    }

    return {
      success: true,
      valid: issues.length === 0,
      keyLocation: keyLocation.toString(),
      finalUrl,
      status: response.status,
      contentType,
      body: body.slice(0, 200),
      issues,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, errorCode: 'timeout' };
    }
    return { success: false, errorCode: 'fetch_failed' };
  } finally {
    clearTimeout(timeout);
  }
}
