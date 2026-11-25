import type { IndexNowEndpointId } from "@/lib/indexnow-endpoints";

const STORAGE_KEY = "submitnow:submission-history:v1";
const MAX_ENTRIES = 50;
const MAX_STORED_SAMPLE_URLS = 200;

export type SubmissionHistoryEntry = {
  id: string;
  createdAt: string;
  host: string;
  urlCount: number;
  outcome: "success" | "error";
  httpStatus?: number;
  errorCode?: string;
  endpointId?: IndexNowEndpointId;
  batchCount?: number;
  /** Up to 200 URLs kept locally for one-click reload/retry. */
  sampleUrls?: string[];
};

export function loadSubmissionHistory(): SubmissionHistoryEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const value = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "[]"
    ) as SubmissionHistoryEntry[];
    return Array.isArray(value) ? value.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

export function addSubmissionHistory(
  entry: Omit<SubmissionHistoryEntry, "id" | "createdAt">
): SubmissionHistoryEntry[] {
  const sanitizedEntry: SubmissionHistoryEntry = {
    ...entry,
    sampleUrls: entry.sampleUrls?.slice(0, MAX_STORED_SAMPLE_URLS),
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  const next = [sanitizedEntry, ...loadSubmissionHistory()].slice(
    0,
    MAX_ENTRIES
  );

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // If quota is exceeded due to sampleUrls, retry storing without URL samples.
    try {
      const compact = next.map(({ sampleUrls: _unused, ...rest }) => rest);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
    } catch {
      // A submission must never fail because browser storage is unavailable.
    }
  }
  return next;
}

export function clearSubmissionHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function escapeCsvCell(value: string | number | undefined): string {
  const raw = value === undefined ? "" : String(value);
  // Neutralize spreadsheet formula prefixes (=, +, -, @)
  const neutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (/[",\r\n]/.test(neutralized)) {
    return `"${neutralized.replaceAll('"', '""')}"`;
  }
  return neutralized;
}

export function serializeSubmissionHistoryCsv(
  entries: SubmissionHistoryEntry[]
): string {
  const header = [
    "timestamp",
    "host",
    "endpoint",
    "url_count",
    "batches",
    "outcome",
    "http_status",
    "error_code",
  ];
  const rows = entries.map((entry) =>
    [
      escapeCsvCell(entry.createdAt),
      escapeCsvCell(entry.host),
      escapeCsvCell(entry.endpointId ?? "bing"),
      escapeCsvCell(entry.urlCount),
      escapeCsvCell(entry.batchCount ?? 1),
      escapeCsvCell(entry.outcome),
      escapeCsvCell(entry.httpStatus),
      escapeCsvCell(entry.errorCode),
    ].join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

export function serializeSubmissionHistoryJson(
  entries: SubmissionHistoryEntry[]
): string {
  return JSON.stringify(entries, null, 2);
}
