"use client";

import { fetchRemoteSitemap } from "@/actions/sitemap-fetch";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { trackEvent } from "@/lib/analytics";
import { stageUrlsForSubmission } from "@/lib/handoff";
import {
  copyText,
  diffSitemapEntries,
  downloadTextFile,
  filterSitemapEntriesByLastMod,
  parseSitemapXml,
} from "@/lib/seo-tools";
import type { SitemapParseResult } from "@/lib/seo-tools";
import {
  deleteSitemapSnapshot,
  loadSitemapSnapshots,
  saveSitemapSnapshot,
  type SitemapSnapshot,
} from "@/lib/sitemap-snapshot";
import {
  Check,
  Copy,
  Database,
  Download,
  FileUp,
  Globe,
  Loader2,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

type UploadedSitemap = {
  fileName: string;
  result: SitemapParseResult;
  fetchMeta?: {
    fetchedSitemapsCount: number;
    truncatedBySitemapLimit: boolean;
    truncatedByUrlLimit: boolean;
  };
};

type FileSlot = "previous" | "current";
type CopyState = "idle" | "copied" | "failed";
type SnapshotState = "idle" | "saved" | "too_large" | "storage_error";

const LASTMOD_OPTIONS = [
  { value: "", key: "all" },
  { value: "1", key: "last24h" },
  { value: "7", key: "last7d" },
  { value: "30", key: "last30d" },
] as const;

async function readPossiblyGzippedFile(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isGzip = bytes.byteLength >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (isGzip && typeof DecompressionStream !== "undefined") {
    const stream = new Blob([bytes])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }
  return new TextDecoder("utf-8").decode(bytes);
}

export default function SitemapDiff() {
  const t = useTranslations("Tools.sitemapDiff");
  const tCommon = useTranslations("Tools.common");
  const router = useRouter();
  const [previous, setPrevious] = useState<UploadedSitemap | null>(null);
  const [current, setCurrent] = useState<UploadedSitemap | null>(null);
  const [includeAdded, setIncludeAdded] = useState(true);
  const [includeChanged, setIncludeChanged] = useState(true);
  const [includeRemoved, setIncludeRemoved] = useState(false);
  const [maxAgeDays, setMaxAgeDays] = useState<string>("");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [snapshots, setSnapshots] = useState<SitemapSnapshot[]>([]);
  const [snapshotState, setSnapshotState] = useState<SnapshotState>("idle");

  // Remote URL input states per slot
  const [remoteUrl, setRemoteUrl] = useState<Record<FileSlot, string>>({
    previous: "",
    current: "",
  });
  const [remoteLoading, setRemoteLoading] = useState<Record<FileSlot, boolean>>({
    previous: false,
    current: false,
  });
  const [remoteError, setRemoteError] = useState<Record<FileSlot, string>>({
    previous: "",
    current: "",
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSnapshots(loadSitemapSnapshots());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const diff = useMemo(() => {
    if (
      previous?.result.type !== "urlset" ||
      current?.result.type !== "urlset"
    ) {
      return null;
    }

    if (previous.result.error || current.result.error) {
      return null;
    }

    return diffSitemapEntries(previous.result.entries, current.result.entries);
  }, [current, previous]);

  const singleExtractFiltered = useMemo(() => {
    if (diff) return null;
    if (current?.result.type !== "urlset" || current.result.error) return null;
    const days = maxAgeDays ? Number(maxAgeDays) : null;
    return filterSitemapEntriesByLastMod(current.result.entries, days);
  }, [current, diff, maxAgeDays]);

  const selectedEntries = useMemo(() => {
    if (!diff) {
      return singleExtractFiltered?.matched ?? [];
    }
    return [
      ...(includeAdded ? diff.added : []),
      ...(includeChanged ? diff.changed : []),
      ...(includeRemoved ? diff.removed : []),
    ];
  }, [diff, includeAdded, includeChanged, includeRemoved, singleExtractFiltered]);

  const handleFileUpload = async (
    slot: FileSlot,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    try {
      const xml = await readPossiblyGzippedFile(file);
      const result = parseSitemapXml(xml);
      const uploaded: UploadedSitemap = { fileName: file.name, result };

      if (slot === "previous") {
        setPrevious(uploaded);
      } else {
        setCurrent(uploaded);
      }
      setRemoteError((prev) => ({ ...prev, [slot]: "" }));
      setCopyState("idle");
      setSnapshotState("idle");
      trackEvent({
        name: "tool_used",
        toolId: "sitemapDiff",
        action: slot === "current" ? "parse_current" : "parse_baseline",
        value: result.entries.length,
      });
    } catch {
      setRemoteError((prev) => ({ ...prev, [slot]: t("errors.invalidXml") }));
    }
  };

  const handleRemoteFetch = async (slot: FileSlot) => {
    const targetUrl = remoteUrl[slot].trim();
    if (!targetUrl) return;

    setRemoteLoading((prev) => ({ ...prev, [slot]: true }));
    setRemoteError((prev) => ({ ...prev, [slot]: "" }));

    const formData = new FormData();
    formData.set("url", targetUrl);

    try {
      const response = await fetchRemoteSitemap(formData);
      if (!response.success) {
        setRemoteError((prev) => ({
          ...prev,
          [slot]: t(`remoteErrors.${response.errorCode}`, {
            status: response.status ?? 0,
          }),
        }));
        return;
      }

      const uploaded: UploadedSitemap = {
        fileName: response.sourceUrl,
        result: {
          type: "urlset",
          entries: response.entries,
          childSitemaps: [],
          invalidLocations: Array.from(
            { length: response.invalidLocationsCount },
            () => ""
          ),
          duplicateCount: response.duplicateCount,
        },
        fetchMeta: {
          fetchedSitemapsCount: response.fetchedSitemapsCount,
          truncatedBySitemapLimit: response.truncatedBySitemapLimit,
          truncatedByUrlLimit: response.truncatedByUrlLimit,
        },
      };

      if (slot === "previous") {
        setPrevious(uploaded);
      } else {
        setCurrent(uploaded);
      }
      setCopyState("idle");
      setSnapshotState("idle");
      trackEvent({
        name: "tool_used",
        toolId: "sitemapDiff",
        action: slot === "current" ? "fetch_current" : "fetch_baseline",
        value: response.entries.length,
      });
    } catch {
      setRemoteError((prev) => ({
        ...prev,
        [slot]: t("remoteErrors.fetch_failed"),
      }));
    } finally {
      setRemoteLoading((prev) => ({ ...prev, [slot]: false }));
    }
  };

  const handleCopy = async () => {
    const didCopy = await copyText(
      selectedEntries.map((entry) => entry.url).join("\n")
    );
    setCopyState(didCopy ? "copied" : "failed");
    if (didCopy) {
      trackEvent({
        name: "tool_used",
        toolId: "sitemapDiff",
        action: "copy_queue",
        value: selectedEntries.length,
      });
    }
  };

  const handleDownload = () => {
    if (selectedEntries.length === 0) return;
    downloadTextFile(
      "indexnow-sitemap-queue.txt",
      selectedEntries.map((entry) => entry.url).join("\n")
    );
    trackEvent({
      name: "tool_used",
      toolId: "sitemapDiff",
      action: "download_queue",
      value: selectedEntries.length,
    });
  };

  const handleSaveSnapshot = () => {
    if (current?.result.type !== "urlset" || current.result.error) return;
    const state = saveSitemapSnapshot(
      current.fileName,
      current.result.entries
    );
    setSnapshotState(state);
    if (state === "saved") {
      setSnapshots(loadSitemapSnapshots());
      trackEvent({
        name: "tool_used",
        toolId: "sitemapDiff",
        action: "save_baseline",
        value: current.result.entries.length,
      });
    }
  };

  const handleUseSnapshot = (item: SitemapSnapshot) => {
    setPrevious({
      fileName: item.sourceFileName,
      result: {
        type: "urlset",
        entries: item.entries,
        childSitemaps: [],
        invalidLocations: [],
        duplicateCount: 0,
      },
    });
    setSnapshotState("idle");
  };

  const handleDeleteSnapshot = (id: string) => {
    setSnapshots(deleteSitemapSnapshot(id));
    setSnapshotState("idle");
  };

  const getResultMessage = (uploaded: UploadedSitemap | null) => {
    if (!uploaded) return null;
    const { result } = uploaded;

    if (result.error === "invalid_xml") return t("errors.invalidXml");
    if (result.error === "empty_urlset") return t("errors.emptyUrlset");
    if (result.type === "index") {
      return t("errors.sitemapIndex", { count: result.childSitemaps.length });
    }
    if (result.type === "unsupported") return t("errors.unsupported");
    if (result.invalidLocations.length > 0) {
      return t("errors.invalidLocations", {
        count: result.invalidLocations.length,
      });
    }
    return null;
  };

  const renderFileSlot = (slot: FileSlot, uploaded: UploadedSitemap | null) => {
    const isPrevious = slot === "previous";
    const message = getResultMessage(uploaded);
    const loading = remoteLoading[slot];
    const fetchErr = remoteError[slot];

    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
        <h2 className="font-heading text-lg font-semibold text-slate-950 dark:text-white">
          {isPrevious ? t("previousTitle") : t("currentTitle")}
        </h2>
        <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {isPrevious ? t("previousHelp") : t("currentHelp")}
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Globe
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              inputMode="url"
              value={remoteUrl[slot]}
              onChange={(event) =>
                setRemoteUrl((prev) => ({ ...prev, [slot]: event.target.value }))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleRemoteFetch(slot);
                }
              }}
              placeholder={t("remoteUrlPlaceholder")}
              disabled={loading}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleRemoteFetch(slot)}
            disabled={loading || !remoteUrl[slot].trim()}
            className="h-10 shrink-0 rounded-xl border-blue-200 bg-blue-50/70 px-3.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
          >
            {loading && (
              <Loader2 className="size-3.5 animate-spin-fast" aria-hidden="true" />
            )}
            {loading ? t("fetchingRemote") : t("fetchRemote")}
          </Button>
        </div>

        {fetchErr && (
          <p
            className="mt-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
            role="alert"
          >
            {fetchErr}
          </p>
        )}

        <label className="mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 text-center transition-[transform,border-color,background-color] duration-150 ease-out-strong hover:border-blue-400 hover:bg-blue-50/70 active:scale-[0.985] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-blue-500 dark:hover:bg-blue-500/10">
          <FileUp
            className="size-5 text-blue-600 dark:text-blue-200"
            aria-hidden="true"
          />
          <span className="mt-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
            {uploaded ? t("replaceFile") : t("chooseFile")}
          </span>
          <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            .xml / .xml.gz
          </span>
          <input
            type="file"
            accept="application/xml,text/xml,application/gzip,.xml,.gz"
            onChange={(event) => handleFileUpload(slot, event)}
            className="sr-only"
          />
        </label>

        {uploaded && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="truncate font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">
              {uploaded.fileName}
            </p>
            {uploaded.result.type === "urlset" && !uploaded.result.error && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {t("entryCount", { count: uploaded.result.entries.length })}
                {uploaded.fetchMeta &&
                  uploaded.fetchMeta.fetchedSitemapsCount > 1 && (
                    <span className="ml-2 text-xs text-blue-700 dark:text-blue-300">
                      ({t("sitemapsFetched", {
                        count: uploaded.fetchMeta.fetchedSitemapsCount,
                      })})
                    </span>
                  )}
              </p>
            )}
          </div>
        )}

        {message && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>{message}</p>
          </div>
        )}
      </section>
    );
  };

  const handleSendToSubmitter = () => {
    stageUrlsForSubmission(selectedEntries.map((entry) => entry.url));
    trackEvent({
      name: "tool_handoff",
      toolId: "sitemapDiff",
      action: "open_submitter",
      value: selectedEntries.length,
    });
    router.push("/#indexnow-form");
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          {renderFileSlot("previous", previous)}
          {snapshots.length > 0 && (
            <div className="mt-3 space-y-2">
              {snapshots.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950/80"
                >
                  <Database
                    className="size-4 shrink-0 text-blue-600 dark:text-blue-300"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">
                    {t("savedSnapshot", {
                      fileName: item.host || item.sourceFileName,
                      date: new Date(item.createdAt).toLocaleDateString(),
                    })}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleUseSnapshot(item)}
                  >
                    {t("useSnapshot")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSnapshot(item.id)}
                    aria-label={t("clearSnapshot")}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        {renderFileSlot("current", current)}
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold text-slate-950 dark:text-white">
              {t("resultsTitle")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {diff ? t("resultsHelp") : t("extractHelp")}
            </p>
          </div>
          {selectedEntries.length > 0 && (
            <p className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold tabular-nums text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
              {t("selectedCount", { count: selectedEntries.length })}
            </p>
          )}
        </div>

        {!diff && current?.result.type === "urlset" && !current.result.error && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
            <label
              htmlFor="sitemap-lastmod-filter"
              className="text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              {t("lastmodFilterLabel")}
            </label>
            <select
              id="sitemap-lastmod-filter"
              value={maxAgeDays}
              onChange={(event) => setMaxAgeDays(event.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {LASTMOD_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.value}>
                  {t(`lastmodOptions.${opt.key}`)}
                </option>
              ))}
            </select>
            {maxAgeDays && singleExtractFiltered && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t("lastmodSummary", {
                  matched: singleExtractFiltered.matched.length,
                  older: singleExtractFiltered.olderCount,
                  missing: singleExtractFiltered.withoutLastModCount,
                })}
              </span>
            )}
          </div>
        )}

        {!diff && selectedEntries.length === 0 && !current ? (
          <p className="mt-8 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm leading-6 text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {t("emptyState")}
          </p>
        ) : (
          <>
            {diff ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-4">
                {[
                  ["added", diff.added.length],
                  ["changed", diff.changed.length],
                  ["removed", diff.removed.length],
                  ["unchanged", diff.unchangedCount],
                ].map(([id, count]) => (
                  <div
                    key={String(id)}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <p className="text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">
                      {count}
                    </p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t(`stats.${id}`)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <p className="text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">
                  {selectedEntries.length}
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t("stats.extracted")}
                </p>
              </div>
            )}

            {diff && (
              <fieldset className="mt-6 grid gap-3 sm:grid-cols-3">
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition-[transform,border-color,background-color] duration-150 ease-out-strong hover:border-blue-300 active:scale-[0.99] has-[:checked]:border-blue-200 has-[:checked]:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:border-blue-500/50 dark:has-[:checked]:border-blue-500/30 dark:has-[:checked]:bg-blue-500/10">
                  <input
                    type="checkbox"
                    checked={includeAdded}
                    onChange={(event) => setIncludeAdded(event.target.checked)}
                    className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {t("includeAdded", { count: diff.added.length })}
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition-[transform,border-color,background-color] duration-150 ease-out-strong hover:border-blue-300 active:scale-[0.99] has-[:checked]:border-blue-200 has-[:checked]:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:border-blue-500/50 dark:has-[:checked]:border-blue-500/30 dark:has-[:checked]:bg-blue-500/10">
                  <input
                    type="checkbox"
                    checked={includeChanged}
                    onChange={(event) => setIncludeChanged(event.target.checked)}
                    className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {t("includeChanged", { count: diff.changed.length })}
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition-[transform,border-color,background-color] duration-150 ease-out-strong hover:border-blue-300 active:scale-[0.99] has-[:checked]:border-blue-200 has-[:checked]:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:border-blue-500/50 dark:has-[:checked]:border-blue-500/30 dark:has-[:checked]:bg-blue-500/10">
                  <input
                    type="checkbox"
                    checked={includeRemoved}
                    onChange={(event) => setIncludeRemoved(event.target.checked)}
                    className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {t("includeRemoved", { count: diff.removed.length })}
                </label>
              </fieldset>
            )}

            {current?.result.type === "urlset" && !current.result.error && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {t("saveSnapshotTitle")}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {t("saveSnapshotHelp")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveSnapshot}
                    className="shrink-0"
                  >
                    <Database className="size-4" aria-hidden="true" />
                    {t("saveSnapshot")}
                  </Button>
                </div>
                {snapshotState !== "idle" && (
                  <p
                    className="mt-3 text-sm text-slate-600 dark:text-slate-300"
                    aria-live="polite"
                  >
                    {t(`snapshotStatus.${snapshotState}`)}
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopy}
                disabled={selectedEntries.length === 0}
                className="h-11 flex-1 rounded-xl border-slate-200 bg-white font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {copyState === "copied" ? (
                  <Check
                    className="size-4 animate-pop-in text-emerald-600 dark:text-emerald-300"
                    aria-hidden="true"
                  />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
                {copyState === "copied" ? tCommon("copied") : t("copyQueue")}
              </Button>
              <Button
                type="button"
                onClick={handleDownload}
                disabled={selectedEntries.length === 0}
                className="h-11 flex-1 rounded-xl bg-slate-950 font-semibold text-white hover:bg-slate-800 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
              >
                <Download className="size-4" aria-hidden="true" />
                {t("downloadQueue")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSendToSubmitter}
                disabled={selectedEntries.length === 0}
                className="h-11 flex-1 rounded-xl border-blue-200 bg-blue-50 font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100 dark:hover:bg-blue-500/20"
              >
                {t("openSubmitter")}
              </Button>
            </div>

            <p className="mt-4 min-h-5 text-sm" aria-live="polite">
              {copyState === "copied" && (
                <span className="text-emerald-700 dark:text-emerald-300">
                  {t("copySuccess")}
                </span>
              )}
              {copyState === "failed" && (
                <span className="text-red-700 dark:text-red-300">
                  {t("copyFailure")}
                </span>
              )}
            </p>

            {selectedEntries.length > 0 && (
              <ul className="mt-4 max-h-64 space-y-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-4 font-mono text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
                {selectedEntries.slice(0, 20).map((entry) => (
                  <li key={entry.url} className="truncate">
                    {entry.url}
                  </li>
                ))}
                {selectedEntries.length > 20 && (
                  <li className="font-sans text-slate-500 dark:text-slate-400">
                    {t("moreUrls", { count: selectedEntries.length - 20 })}
                  </li>
                )}
              </ul>
            )}
          </>
        )}
      </section>
    </>
  );
}
