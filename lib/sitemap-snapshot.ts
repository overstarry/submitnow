import type { SitemapEntry } from "@/lib/seo-tools";

const STORAGE_KEY = "submitnow:sitemap-baseline:v1";
const MAX_ENTRIES = 10_000;

export type SitemapSnapshot = {
  version: 1;
  createdAt: string;
  sourceFileName: string;
  entries: SitemapEntry[];
};

export type SnapshotSaveResult = "saved" | "too_large" | "storage_error";

export function loadSitemapSnapshot(): SitemapSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as Partial<SitemapSnapshot>;
    if (
      snapshot.version !== 1 ||
      typeof snapshot.createdAt !== "string" ||
      typeof snapshot.sourceFileName !== "string" ||
      !Array.isArray(snapshot.entries)
    ) {
      return null;
    }
    return snapshot as SitemapSnapshot;
  } catch {
    return null;
  }
}

export function saveSitemapSnapshot(
  fileName: string,
  entries: SitemapEntry[]
): SnapshotSaveResult {
  if (typeof window === "undefined") return "storage_error";
  if (entries.length > MAX_ENTRIES) return "too_large";

  const snapshot: SitemapSnapshot = {
    version: 1,
    createdAt: new Date().toISOString(),
    sourceFileName: fileName,
    entries,
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return "saved";
  } catch {
    return "storage_error";
  }
}

export function clearSitemapSnapshot(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
