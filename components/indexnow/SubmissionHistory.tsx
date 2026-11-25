"use client";

import { Button } from "@/components/ui/button";
import { resolveIndexNowEndpoint } from "@/lib/indexnow-endpoints";
import { downloadTextFile } from "@/lib/seo-tools";
import {
  serializeSubmissionHistoryCsv,
  serializeSubmissionHistoryJson,
  type SubmissionHistoryEntry,
} from "@/lib/submission-history";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

type SubmissionHistoryProps = {
  entries: SubmissionHistoryEntry[];
  onClear: () => void;
  onReload?: (entry: SubmissionHistoryEntry) => void;
};

const INITIAL_VISIBLE = 10;

export default function SubmissionHistory({
  entries,
  onClear,
  onReload,
}: SubmissionHistoryProps) {
  const t = useTranslations("IndexNow.history");
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  const visibleEntries = expanded
    ? entries
    : entries.slice(0, INITIAL_VISIBLE);
  const hasMore = entries.length > INITIAL_VISIBLE;

  const handleExportCsv = () => {
    if (entries.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(
      `submitnow-history-${stamp}.csv`,
      serializeSubmissionHistoryCsv(entries),
      "text/csv;charset=utf-8"
    );
  };

  const handleExportJson = () => {
    if (entries.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(
      `submitnow-history-${stamp}.json`,
      serializeSubmissionHistoryJson(entries),
      "application/json;charset=utf-8"
    );
  };

  return (
    <section className="border-t border-slate-200/70 px-6 py-6 dark:border-slate-800/70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-white">
            {t("title")}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {t("privacy")}
          </p>
        </div>
        {entries.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-8 rounded-lg border-slate-200 bg-white px-2.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Download className="size-3.5" aria-hidden="true" />
              {t("exportCsv")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportJson}
              className="h-8 rounded-lg border-slate-200 bg-white px-2.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Download className="size-3.5" aria-hidden="true" />
              {t("exportJson")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-8 shrink-0 px-2.5 text-xs text-slate-600 dark:text-slate-300"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              {t("clear")}
            </Button>
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
          {t("empty")}
        </p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {visibleEntries.map((entry) => {
              const endpoint = resolveIndexNowEndpoint(
                entry.endpointId ?? "bing"
              );
              const canReload = Boolean(
                onReload && (entry.sampleUrls?.length || entry.host)
              );

              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 bg-white px-4 py-3 text-sm transition-colors duration-150 hover:bg-slate-50/80 dark:bg-slate-950/60 dark:hover:bg-slate-900/60"
                >
                  {entry.outcome === "success" ? (
                    <CheckCircle2
                      className="size-4 shrink-0 text-emerald-600 dark:text-emerald-300"
                      aria-hidden="true"
                    />
                  ) : (
                    <XCircle
                      className="size-4 shrink-0 text-red-600 dark:text-red-300"
                      aria-hidden="true"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                        {entry.host || t("unknownHost")}
                      </p>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {endpoint.id}
                      </span>
                      {entry.batchCount && entry.batchCount > 1 && (
                        <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                          {t("batchesBadge", { count: entry.batchCount })}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {t(entry.outcome, {
                        count: entry.urlCount,
                        status: entry.httpStatus ?? "—",
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {canReload && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onReload?.(entry)}
                        title={t("reload")}
                        className="h-7 rounded-lg px-2 text-xs text-slate-600 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-200"
                      >
                        <RotateCcw className="size-3.5" aria-hidden="true" />
                        <span className="hidden sm:inline">{t("reload")}</span>
                      </Button>
                    )}
                    <time
                      dateTime={entry.createdAt}
                      className="text-xs tabular-nums text-slate-500 dark:text-slate-400"
                    >
                      {new Intl.DateTimeFormat(locale, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(entry.createdAt))}
                    </time>
                  </div>
                </li>
              );
            })}
          </ul>

          {hasMore && (
            <div className="mt-3 flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((prev) => !prev)}
                className="text-xs text-slate-600 dark:text-slate-300"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="size-3.5" aria-hidden="true" />
                    {t("showLess")}
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                    {t("showAll", { count: entries.length })}
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
