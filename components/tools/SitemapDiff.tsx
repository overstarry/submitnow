"use client";

import ToolPageShell from "@/components/tools/ToolPageShell";
import { Button } from "@/components/ui/button";
import { Link as I18nLink } from "@/i18n/routing";
import {
  copyText,
  diffSitemapEntries,
  downloadTextFile,
  parseSitemapXml,
} from "@/lib/seo-tools";
import type { SitemapParseResult } from "@/lib/seo-tools";
import {
  Check,
  Copy,
  Download,
  FileUp,
  GitCompareArrows,
  TriangleAlert,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type UploadedSitemap = {
  fileName: string;
  result: SitemapParseResult;
};

type FileSlot = "previous" | "current";
type CopyState = "idle" | "copied" | "failed";

export default function SitemapDiff() {
  const t = useTranslations("Tools.sitemapDiff");
  const tCommon = useTranslations("Tools.common");
  const [previous, setPrevious] = useState<UploadedSitemap | null>(null);
  const [current, setCurrent] = useState<UploadedSitemap | null>(null);
  const [includeAdded, setIncludeAdded] = useState(true);
  const [includeChanged, setIncludeChanged] = useState(true);
  const [copyState, setCopyState] = useState<CopyState>("idle");

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
    if (!diff) return [];
    return [
      ...(includeAdded ? diff.added : []),
      ...(includeChanged ? diff.changed : []),
    ];
  }, [diff, includeAdded, includeChanged]);

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
  };

  const handleCopy = async () => {
    const didCopy = await copyText(
      selectedEntries.map((entry) => entry.url).join("\n")
    );
    setCopyState(didCopy ? "copied" : "failed");
  };

  const handleDownload = () => {
    if (selectedEntries.length === 0) return;
    downloadTextFile(
      "indexnow-sitemap-queue.txt",
      selectedEntries.map((entry) => entry.url).join("\n")
    );
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

        <label className="mt-5 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/70 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-blue-500 dark:hover:bg-blue-500/10">
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

  return (
    <ToolPageShell
      icon={GitCompareArrows}
      title={t("title")}
      description={t("description")}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {renderFileSlot("previous", previous)}
        {renderFileSlot("current", current)}
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold text-slate-950 dark:text-white">
              {t("resultsTitle")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {t("resultsHelp")}
            </p>
          </div>
          {diff && (
            <p className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
              {t("selectedCount", { count: selectedEntries.length })}
            </p>
          )}
        </div>

        {!diff ? (
          <p className="mt-8 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm leading-6 text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {t("emptyState")}
          </p>
        ) : (
          <>
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

            <fieldset className="mt-6 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition-colors hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:border-blue-500/50">
                <input
                  type="checkbox"
                  checked={includeAdded}
                  onChange={(event) => setIncludeAdded(event.target.checked)}
                  className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {t("includeAdded", { count: diff.added.length })}
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition-colors hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:border-blue-500/50">
                <input
                  type="checkbox"
                  checked={includeChanged}
                  onChange={(event) => setIncludeChanged(event.target.checked)}
                  className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {t("includeChanged", { count: diff.changed.length })}
              </label>
            </fieldset>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopy}
                disabled={selectedEntries.length === 0}
                className="h-11 flex-1 rounded-xl border-slate-200 bg-white font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {copyState === "copied" ? (
                  <Check className="size-4 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
                {copyState === "copied" ? tCommon("copied") : t("copyQueue")}
              </Button>
              <Button
                type="button"
                onClick={handleDownload}
                disabled={selectedEntries.length === 0}
                className="h-11 flex-1 rounded-xl bg-slate-950 font-semibold text-white hover:bg-slate-800 dark:bg-blue-500 dark:text-slate-950 dark:hover:bg-blue-400"
              >
                <Download className="size-4" aria-hidden="true" />
                {t("downloadQueue")}
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                className="h-11 flex-1 rounded-xl border-blue-200 bg-blue-50 font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100 dark:hover:bg-blue-500/20"
              >
                <I18nLink href="/">{t("openSubmitter")}</I18nLink>
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
    </ToolPageShell>
  );
}
