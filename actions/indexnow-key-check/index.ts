'use server';

import {
  verifyRemoteKeyFile,
  type RuntimeKeyCheckErrorCode,
  type RuntimeKeyCheckIssue,
} from '@/lib/indexnow-runtime';
import { checkActionRateLimit } from '@/lib/rateLimit';
import { z } from 'zod';

export type KeyCheckErrorCode =
  | 'invalid_form'
  | 'rate_limited'
  | RuntimeKeyCheckErrorCode;

export type KeyCheckIssue = RuntimeKeyCheckIssue;

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

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export async function checkIndexNowKey(
  formData: FormData
): Promise<KeyCheckResult> {
  const rateLimit = await checkActionRateLimit('key_check');
  if (!rateLimit.allowed) {
    return { success: false, errorCode: 'rate_limited' };
  }

  const parsed = checkSchema.safeParse({
    key: field(formData, 'key'),
    host: field(formData, 'host'),
    keyLocation: field(formData, 'keyLocation'),
  });

  if (!parsed.success) {
    return { success: false, errorCode: 'invalid_form' };
  }

  const result = await verifyRemoteKeyFile({
    host: parsed.data.host,
    key: parsed.data.key,
    keyLocation: parsed.data.keyLocation || undefined,
  });

  if (!result.ok) {
    return { success: false, errorCode: result.errorCode };
  }

  return {
    success: true,
    valid: result.valid,
    keyLocation: result.keyLocation,
    finalUrl: result.finalUrl,
    status: result.status,
    contentType: result.contentType,
    body: result.body,
    issues: result.issues,
  };
}
