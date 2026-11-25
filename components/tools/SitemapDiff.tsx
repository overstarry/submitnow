"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { trackEvent } from "@/lib/analytics";
import { stageUrlsForSubmission } from "@/lib/handoff";
import {
  copyText,
  diffSitemapEntries,
  downloadTextFile,
  parseSitemapXml,
} from "@/lib/seo-tools";
import type { SitemapParseResult } from "@/lib/seo-tools";
import {
  clearSitemapSnapshot,
  loadSitemapSnapshot,
  saveSitemapSnapshot,
  type SitemapSnapshot,
} from "@/lib/sitemap-snapshot";
import {
  Check,
  Copy,
  Database,
  Download,
  FileUp,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

type UploadedSitemap = {
  fileName: string;
  result: SitemapParseResult;
};

type FileSlot = "previous" | "current";
type CopyState = "idle" | "copied" | "failed";
type SnapshotState = "idle" | "saved" | "too_large" | "storage_error";

export default function SitemapDiff() {
  const t = useTranslations("Tools.sitemapDiff");
  const tCommon = useTranslations("Tools.common");
  const router = useRouter();
  const [previous, setPrevious] = useState<UploadedSitemap | null>(null);
  const [current, setCurrent] = useState<UploadedSitemap | null>(null);
  const [includeAdded, setIncludeAdded] = useState(true);
  const [includeChanged, setIncludeChanged] = useState(true);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [snapshot, setSnapshot] = useState<SitemapSnapshot | null>(null);
  const [snapshotState, setSnapshotState] = useState<SnapshotState>("idle");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSnapshot(loadSitemapSnapshot());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const diff = useMemo(() => {
    if (previous?.result.type !== "urlset" || current?.result.type !== "urlset") {
      return null;
    }

    if (previous.result.error || current.result.error) {
      return null;
    }

    return diffSitemapEntries(previous.result.entries, current.result.entries);
  }, [current, previous]);

  const selectedEntries = useMemo(() => {
    if (!diff) {
      return current?.result.type === "urlset" && !current.result.error
        ? current.result.entries
        : [];
    }
    return [
      ...(includeAdded ? diff.added : []),
      ...(includeChanged ? diff.changed : []),
    ];
  }, [current, diff, includeAdded, includeChanged]);

  const handleFileUpload = async (
    slot: FileSlot,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    const result = parseSitemapXml(await file.text());
    const uploaded = { fileName: file.name, result };

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
      action: slot === "current" ? "parse_current" : "parse_baseline",
      value: result.entries.length,
    });
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
      setSnapshot(loadSitemapSnapshot());
      trackEvent({
        name: "tool_used",
        toolId: "sitemapDiff",
        action: "save_baseline",
        value: current.result.entries.length,
      });
    }
  };

  const handleUseSnapshot = () => {
    if (!snapshot) return;
    setPrevious({
      fileName: snapshot.sourceFileName,
      result: {
        type: "urlset",
        entries: snapshot.entries,
        childSitemaps: [],
        invalidLocations: [],
        duplicateCount: 0,
      },
    });
    setSnapshotState("idle");
  };

  const handleClearSnapshot = () => {
    clearSitemapSnapshot();
    setSnapshot(null);
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
      return t("errors.invalidLocations", { count: result.invalidLocations.length });
    }
    return null;
  };

  const renderFileSlot = (slot: FileSlot, uploaded: UploadedSitemap | null) => {
    const isPrevious = slot === "previous";
    const message = getResultMessage(uploaded);

    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
        <h2 className="font-heading text-lg font-semibold text-slate-950 dark:text-white">
          {isPrevious ? t("previousTitle") : t("currentTitle")}
        </h2>
        <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {isPrevious ? t("previousHelp") : t("currentHelp")}
        </p>

        <label className="mt-5 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 text-center transition-[transform,border-color,background-color] duration-150 ease-out-strong hover:border-blue-400 hover:bg-blue-50/70 active:scale-[0.985] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-blue-500 dark:hover:bg-blue-500/10">
          <FileUp className="size-5 text-blue-600 dark:text-blue-200" aria-hidden="true" />
          <span className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            {uploaded ? t("replaceFile") : t("chooseFile")}
          </span>
          <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">.xml</span>
          <input
            type="file"
            accept="application/xml,text/xml,.xml"
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
          {snapshot && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950/80">
              <Database
                className="size-4 text-blue-600 dark:text-blue-300"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">
                {t("savedSnapshot", {
                  fileName: snapshot.sourceFileName,
                  date: new Date(snapshot.createdAt).toLocaleDateString(),
                })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUseSnapshot}
              >
                {t("useSnapshot")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClearSnapshot}
                aria-label={t("clearSnapshot")}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
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
            <p className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
              {t("selectedCount", { count: selectedEntries.length })}
            </p>
          )}
        </div>

        {selectedEntries.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm leading-6 text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {t("emptyState")}
          </p>
        ) : (
          <>
            {diff ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  ["added", diff.added.length],
                  ["changed", diff.changed.length],
                  ["unchanged", diff.unchangedCount],
                ].map(([id, count]) => (
                  <div
                    key={String(id)}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <p className="text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">{count}</p>
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
              <fieldset className="mt-6 grid gap-3 sm:grid-cols-2">
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
              </fieldset>
            )}

            {!diff && current?.result.type === "urlset" && (
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
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
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
                  <Check className="size-4 animate-pop-in text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
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
                <span className="text-emerald-700 dark:text-emerald-300">{t("copySuccess")}</span>
              )}
              {copyState === "failed" && (
                <span className="text-red-700 dark:text-red-300">{t("copyFailure")}</span>
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
