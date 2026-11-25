"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { trackEvent } from "@/lib/analytics";
import { stageUrlsForSubmission } from "@/lib/handoff";
import { analyzeUrlList, copyText } from "@/lib/seo-tools";
import {
  Check,
  ClipboardCheck,
  Copy,
  FileUp,
  TriangleAlert,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type CopyTarget = string | null;

export default function IndexNowBatchBuilder() {
  const t = useTranslations("Tools.batchBuilder");
  const tCommon = useTranslations("Tools.common");
  const router = useRouter();
  const [rawUrls, setRawUrls] = useState("");
  const [copyTarget, setCopyTarget] = useState<CopyTarget>(null);
  const [importError, setImportError] = useState(false);
  const analysis = useMemo(() => analyzeUrlList(rawUrls), [rawUrls]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    try {
      setRawUrls(await file.text());
      setImportError(false);
      trackEvent({ name: "tool_used", toolId: "batchBuilder", action: "import_file" });
    } catch {
      setImportError(true);
    }
  };

  const handleCopy = async (target: string, urls: string[]) => {
    const didCopy = await copyText(urls.join("\n"));
    setCopyTarget(didCopy ? target : "failed");
    if (didCopy) {
      trackEvent({
        name: "tool_used",
        toolId: "batchBuilder",
        action: "copy_group",
        value: urls.length,
      });
    }

    window.setTimeout(() => setCopyTarget(null), 2500);
  };

  // A submission covers exactly one host, so the handoff carries the first
  // group rather than the whole list.
  const handleSendToSubmitter = (urls: string[]) => {
    stageUrlsForSubmission(urls);
    trackEvent({
      name: "tool_handoff",
      toolId: "batchBuilder",
      action: "open_submitter",
      value: urls.length,
    });
    router.push("/#indexnow-form");
  };

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-heading text-xl font-semibold text-slate-950 dark:text-white">
                {t("inputTitle")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t("inputHelp")}
              </p>
            </div>
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-[transform,background-color,border-color,color] duration-150 ease-out-strong hover:bg-slate-50 active:scale-[0.97] focus-within:ring-2 focus-within:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
              <FileUp className="size-4" aria-hidden="true" />
              {t("importFile")}
              <input
                type="file"
                accept=".txt,.csv,text/plain,text/csv"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>
          </div>

          <label htmlFor="batch-url-list" className="sr-only">
            {t("inputTitle")}
          </label>
          <textarea
            id="batch-url-list"
            value={rawUrls}
            onChange={(event) => setRawUrls(event.target.value)}
            placeholder={t("placeholder")}
            rows={14}
            className="mt-6 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 font-mono text-sm leading-6 text-slate-950 outline-none transition-[border-color,box-shadow,background-color] duration-150 ease-out-strong placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
          />
          {importError && (
            <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
              {t("importFailure")}
            </p>
          )}
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 sm:p-8">
          <h2 className="font-heading text-xl font-semibold text-slate-950 dark:text-white">
            {t("summaryTitle")}
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              ["valid", analysis.validUrls.length],
              ["hosts", analysis.hostGroups.length],
              ["duplicates", analysis.duplicateCount],
              ["invalid", analysis.invalidInputs.length],
            ].map(([id, count]) => (
              <div
                key={String(id)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950/70"
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
          <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {analysis.hostGroups.length > 1 ? t("multipleHosts") : t("singleHost")}
          </p>
          {analysis.validUrls.length > 10_000 && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              {t("tooManyUrls", { count: analysis.validUrls.length })}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => handleCopy("all", analysis.validUrls)}
            disabled={analysis.validUrls.length === 0}
            className="mt-6 h-11 w-full rounded-xl border-slate-200 bg-white font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            {copyTarget === "all" ? (
              <Check className="size-4 animate-pop-in text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {copyTarget === "all" ? tCommon("copied") : t("copyAll")}
          </Button>
        </aside>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold text-slate-950 dark:text-white">
              {t("groupsTitle")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {t("groupsHelp")}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => handleSendToSubmitter(analysis.hostGroups[0].urls)}
            disabled={analysis.hostGroups.length === 0}
            className="h-11 self-start rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:self-auto"
          >
            <ClipboardCheck className="size-4" aria-hidden="true" />
            {analysis.hostGroups.length > 1
              ? t("sendFirstGroup", { host: analysis.hostGroups[0].host })
              : t("openSubmitter")}
          </Button>
        </div>

        {analysis.hostGroups.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {t("emptyState")}
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {analysis.hostGroups.map((group) => (
              <div
                key={group.host}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-slate-950 dark:text-white">{group.host}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {t("hostCount", { count: group.urls.length })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCopy(group.host, group.urls)}
                    className="h-10 rounded-xl border-slate-200 bg-white font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    {copyTarget === group.host ? (
                      <Check className="size-4 animate-pop-in text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                    ) : (
                      <Copy className="size-4" aria-hidden="true" />
                    )}
                    {copyTarget === group.host ? tCommon("copied") : t("copyGroup")}
                  </Button>
                </div>
                <ul className="mt-4 space-y-2 border-t border-slate-200 pt-4 font-mono text-xs leading-5 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                  {group.urls.slice(0, 5).map((url) => (
                    <li key={url} className="truncate">
                      {url}
                    </li>
                  ))}
                  {group.urls.length > 5 && (
                    <li className="font-sans text-slate-500 dark:text-slate-400">
                      {t("moreUrls", { count: group.urls.length - 5 })}
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}

        {analysis.invalidInputs.length > 0 && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">{t("invalidTitle")}</p>
                <p className="mt-1 text-amber-800 dark:text-amber-200">{t("invalidHelp")}</p>
                <ul className="mt-3 space-y-1 font-mono text-xs text-amber-800 dark:text-amber-200">
                  {analysis.invalidInputs.slice(0, 5).map((input, index) => (
                    <li key={`${input}-${index}`} className="truncate">
                      {input || t("emptyValue")}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
