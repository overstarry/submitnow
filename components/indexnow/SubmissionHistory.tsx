"use client";

import { Button } from "@/components/ui/button";
import type { SubmissionHistoryEntry } from "@/lib/submission-history";
import { CheckCircle2, Trash2, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

type SubmissionHistoryProps = {
  entries: SubmissionHistoryEntry[];
  onClear: () => void;
};

export default function SubmissionHistory({
  entries,
  onClear,
}: SubmissionHistoryProps) {
  const t = useTranslations("IndexNow.history");
  const locale = useLocale();

  return (
    <section className="border-t border-slate-200/70 px-6 py-6 dark:border-slate-800/70">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-white">
            {t("title")}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {t("privacy")}
          </p>
        </div>
        {entries.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="shrink-0 text-slate-600 dark:text-slate-300"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {t("clear")}
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
          {t("empty")}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {entries.slice(0, 10).map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-3 bg-white px-4 py-3 text-sm dark:bg-slate-950/60"
            >
              {entry.outcome === "success" ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
              ) : (
                <XCircle className="size-4 shrink-0 text-red-600 dark:text-red-300" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                  {entry.host || t("unknownHost")}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t(entry.outcome, {
                    count: entry.urlCount,
                    status: entry.httpStatus ?? "—",
                  })}
                </p>
              </div>
              <time
                dateTime={entry.createdAt}
                className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400"
              >
                {new Intl.DateTimeFormat(locale, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(entry.createdAt))}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
