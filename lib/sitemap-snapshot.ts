import type { SitemapEntry } from "@/lib/seo-tools";

const LEGACY_STORAGE_KEY = "submitnow:sitemap-baseline:v1";
const STORAGE_KEY = "submitnow:sitemap-baselines:v2";
const MAX_ENTRIES = 10_000;
const MAX_SNAPSHOTS = 6;

export type SitemapSnapshot = {
  id: string;
  version: 1;
  host: string;
  createdAt: string;
  sourceFileName: string;
  entries: SitemapEntry[];
};

export type SnapshotSaveResult = "saved" | "too_large" | "storage_error";

function inferHost(entries: SitemapEntry[], fallbackName: string): string {
  for (const entry of entries) {
    try {
      return new URL(entry.url).hostname;
    } catch {
      // continue
    }
  }
  return fallbackName;
}

function readAllSnapshots(): SitemapSnapshot[] {
  if (typeof window === "undefined") return [];

  try {
    const rawV2 = window.localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is SitemapSnapshot => {
          const s = item as Partial<SitemapSnapshot> | null;
          return (
            Boolean(s) &&
            typeof s?.id === "string" &&
            typeof s?.createdAt === "string" &&
            typeof s?.sourceFileName === "string" &&
            Array.isArray(s?.entries)
          );
        });
      }
    }

    // Transparent migration from single-snapshot v1 key
    const rawV1 = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawV1) {
      const legacy = JSON.parse(rawV1) as Partial<SitemapSnapshot> | null;
      if (
        legacy?.version === 1 &&
        typeof legacy.createdAt === "string" &&
        typeof legacy.sourceFileName === "string" &&
        Array.isArray(legacy.entries)
      ) {
        const host = inferHost(legacy.entries, legacy.sourceFileName);
        const migrated: SitemapSnapshot = {
          id: host,
          version: 1,
          host,
          createdAt: legacy.createdAt,
          sourceFileName: legacy.sourceFileName,
          entries: legacy.entries,
        };
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify([migrated]));
        } catch {
          // ignore
        }
        return [migrated];
      }
    }
  } catch {
    return [];
  }

  return [];
}

export function loadSitemapSnapshots(): SitemapSnapshot[] {
  return readAllSnapshots();
}

export function loadSitemapSnapshot(): SitemapSnapshot | null {
  return readAllSnapshots()[0] ?? null;
}

export function saveSitemapSnapshot(
  fileName: string,
  entries: SitemapEntry[]
): SnapshotSaveResult {
  if (typeof window === "undefined") return "storage_error";
  if (entries.length > MAX_ENTRIES) return "too_large";

  const host = inferHost(entries, fileName);
  const snapshot: SitemapSnapshot = {
    id: host,
    version: 1,
    host,
    createdAt: new Date().toISOString(),
    sourceFileName: fileName,
    entries,
  };

  const existing = readAllSnapshots().filter((item) => item.id !== host);
  const next = [snapshot, ...existing].slice(0, MAX_SNAPSHOTS);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return "saved";
  } catch {
    // Fallback: if localStorage quota is tight with multiple snapshots, keep just this one.
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([snapshot]));
      return "saved";
    } catch {
      return "storage_error";
    }
  }
}

export function deleteSitemapSnapshot(id: string): SitemapSnapshot[] {
  if (typeof window === "undefined") return [];
  const next = readAllSnapshots().filter((item) => item.id !== id);
  try {
    if (next.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // ignore
  }
  return next;
}

export function clearSitemapSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
}
