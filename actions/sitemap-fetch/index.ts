'use server';

import {
  fetchRemoteSitemapEntries,
  type RuntimeSitemapErrorCode,
} from '@/lib/indexnow-runtime';
import { checkActionRateLimit } from '@/lib/rateLimit';
import type { SitemapEntry } from '@/lib/seo-tools';

export type SitemapFetchErrorCode = 'rate_limited' | RuntimeSitemapErrorCode;

export type FetchRemoteSitemapResult =
  | {
      success: true;
      sourceUrl: string;
      entries: SitemapEntry[];
      totalExtractedCount: number;
      fetchedSitemapsCount: number;
      childSitemapsFound: number;
      failedSitemapsCount: number;
      duplicateCount: number;
      invalidLocationsCount: number;
      truncatedBySitemapLimit: boolean;
      truncatedByUrlLimit: boolean;
      filteredOutByLastModCount: number;
      withoutLastModCount: number;
    }
  | {
      success: false;
      errorCode: SitemapFetchErrorCode;
      status?: number;
    };

export async function fetchRemoteSitemap(
  formData: FormData
): Promise<FetchRemoteSitemapResult> {
  const rateLimit = await checkActionRateLimit('sitemap_fetch');
  if (!rateLimit.allowed) {
    return { success: false, errorCode: 'rate_limited' };
  }

  const rawUrl = String(formData.get('url') ?? '');
  const rawMaxAge = String(formData.get('maxAgeDays') ?? '').trim();
  const maxAgeDays =
    rawMaxAge && Number.isFinite(Number(rawMaxAge)) && Number(rawMaxAge) > 0
      ? Number(rawMaxAge)
      : null;

  const result = await fetchRemoteSitemapEntries({
    url: rawUrl,
    maxAgeDays,
  });

  if (!result.ok) {
    return {
      success: false,
      errorCode: result.errorCode,
      status: result.status,
    };
  }

  return {
    success: true,
    sourceUrl: result.sourceUrl,
    entries: result.entries,
    totalExtractedCount: result.totalExtractedCount,
    fetchedSitemapsCount: result.fetchedSitemapsCount,
    childSitemapsFound: result.childSitemapsFound,
    failedSitemapsCount: result.failedSitemapsCount,
    duplicateCount: result.duplicateCount,
    invalidLocationsCount: result.invalidLocationsCount,
    truncatedBySitemapLimit: result.truncatedBySitemapLimit,
    truncatedByUrlLimit: result.truncatedByUrlLimit,
    filteredOutByLastModCount: result.filteredOutByLastModCount,
    withoutLastModCount: result.withoutLastModCount,
  };
}
