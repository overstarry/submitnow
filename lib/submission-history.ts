const STORAGE_KEY = "submitnow:submission-history:v1";
const MAX_ENTRIES = 50;

export type SubmissionHistoryEntry = {
  id: string;
  createdAt: string;
  host: string;
  urlCount: number;
  outcome: "success" | "error";
  httpStatus?: number;
  errorCode?: string;
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
  const next = [
    {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    },
    ...loadSubmissionHistory(),
  ].slice(0, MAX_ENTRIES);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // A submission must never fail because browser storage is unavailable.
  }
  return next;
}

export function clearSubmissionHistory(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
