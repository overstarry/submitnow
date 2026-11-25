'use server';

import type { IndexNowEndpointId } from '@/lib/indexnow-endpoints';
import {
  submitIndexNowBatches,
  type RuntimeSubmitErrorCode,
} from '@/lib/indexnow-runtime';
import { checkActionRateLimit } from '@/lib/rateLimit';
import { z } from 'zod';

export type IndexNowErrorCode =
  | 'invalid_form'
  | 'rate_limited'
  | RuntimeSubmitErrorCode;

export type SubmitIndexNowResult =
  | {
      success: true;
      status: number;
      submittedCount: number;
      host: string;
      keyLocation: string;
      endpointId: IndexNowEndpointId;
      endpointName: string;
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
  endpoint: z.string().trim().optional(),
});

export async function submitIndexNow(
  formData: FormData
): Promise<SubmitIndexNowResult> {
  const rateLimit = await checkActionRateLimit('indexnow_submit');
  if (!rateLimit.allowed) {
    return {
      success: false,
      errorCode: 'rate_limited',
      details: { retryAfterSeconds: rateLimit.retryAfterSeconds ?? 60 },
    };
  }

  const parsed = submitSchema.safeParse({
    key: String(formData.get('key') ?? ''),
    urls: String(formData.get('urls') ?? ''),
    host: String(formData.get('host') ?? '').trim() || undefined,
    keyLocation: String(formData.get('keyLocation') ?? '').trim() || undefined,
    endpoint: String(formData.get('endpoint') ?? '').trim() || undefined,
  });

  if (!parsed.success) {
    return { success: false, errorCode: 'invalid_form' };
  }

  const result = await submitIndexNowBatches({
    urls: [parsed.data.urls],
    key: parsed.data.key,
    host: parsed.data.host,
    keyLocation: parsed.data.keyLocation,
    endpointId: parsed.data.endpoint,
    enforceSingleBatch: true,
  });

  if (!result.ok) {
    return {
      success: false,
      errorCode: result.errorCode,
      message: result.message,
      details: result.details,
    };
  }

  return {
    success: true,
    status: result.status,
    submittedCount: result.submittedCount,
    host: result.host,
    keyLocation: result.keyLocation,
    endpointId: result.endpointId,
    endpointName: result.endpointName,
  };
}
