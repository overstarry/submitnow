"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { trackEvent } from "@/lib/analytics";
import { stageUrlsForSubmission } from "@/lib/handoff";
import {
  copyText,
  normalizeUrlList,
  type UrlNormalizationOptions,
} from "@/lib/seo-tools";
import { Check, Copy, WandSparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

const DEFAULT_OPTIONS: UrlNormalizationOptions = {
  removeFragment: true,
  removeTrackingParameters: false,
  sortQueryParameters: false,
  removeTrailingSlash: false,
};

export default function UrlNormalizer() {
  const t = useTranslations("Tools.urlNormalizer");
  const tCommon = useTranslations("Tools.common");
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [copied, setCopied] = useState(false);

  const results = useMemo(() => normalizeUrlList(raw, options), [options, raw]);
  const validUrls = useMemo(
    () =>
      Array.from(
        new Set(
          results
            .map((result) => result.normalized)
            .filter((url): url is string => Boolean(url))
        )
      ),
    [results]
  );
  const invalidCount = results.length - validUrls.length;

  const toggleOption = (option: keyof UrlNormalizationOptions) => {
    setOptions((current) => ({ ...current, [option]: !current[option] }));
    setCopied(false);
  };

  const handleCopy = async () => {
    const didCopy = await copyText(validUrls.join("\n"));
    setCopied(didCopy);
    if (didCopy) {
      trackEvent({
        name: "tool_used",
        toolId: "urlNormalizer",
        action: "copy",
        value: validUrls.length,
      });
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmitter = () => {
    stageUrlsForSubmission(validUrls);
    trackEvent({
      name: "tool_handoff",
      toolId: "urlNormalizer",
      action: "open_submitter",
      value: validUrls.length,
    });
    router.push("/#indexnow-form");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-8">
        <h2 className="font-heading text-xl font-semibold text-slate-950 dark:text-white">
          {t("inputTitle")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {t("inputHelp")}
        </p>
        <textarea
          value={raw}
          onChange={(event) => {
            setRaw(event.target.value);
            setCopied(false);
          }}
          rows={12}
          placeholder={"https://example.com/article/?utm_source=email#intro\nhttps://example.com/docs/?b=2&a=1"}
          className="mt-5 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-950 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-blue-900"
        />

        <fieldset className="mt-5 space-y-3">
          <legend className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("optionsTitle")}
          </legend>
          {(Object.keys(DEFAULT_OPTIONS) as (keyof UrlNormalizationOptions)[]).map(
            (option) => (
              <label
                key={option}
                className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-700 dark:text-slate-300"
              >
                <input
                  type="checkbox"
                  checked={options[option]}
                  onChange={() => toggleOption(option)}
                  className="mt-1 size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {t(`options.${option}.label`)}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {t(`options.${option}.help`)}
                  </span>
                </span>
              </label>
            )
          )}
        </fieldset>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-semibold text-slate-950 dark:text-white">
              {t("resultsTitle")}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {t("resultSummary", {
                valid: validUrls.length,
                invalid: invalidCount,
              })}
            </p>
          </div>
          <WandSparkles className="size-5 text-blue-600 dark:text-blue-300" aria-hidden="true" />
        </div>

        {results.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-16 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {t("emptyState")}
          </p>
        ) : (
          <ul className="mt-6 max-h-[32rem] space-y-3 overflow-auto">
            {results.slice(0, 100).map((result, index) => (
              <li
                key={`${result.original}-${index}`}
                className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/70"
              >
                {result.normalized ? (
                  <>
                    <p className="break-all font-mono text-xs leading-5 text-slate-900 dark:text-slate-100">
                      {result.normalized}
                    </p>
                    {result.changes.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {result.changes.map((change) => t(`changes.${change}`)).join(" · ")}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="break-all font-mono text-xs leading-5 text-red-700 dark:text-red-300">
                      {result.original}
                    </p>
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {t(`errors.${result.error}`)}
                    </p>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            disabled={validUrls.length === 0}
            className="h-11 flex-1 rounded-xl"
          >
            {copied ? (
              <Check className="size-4 text-emerald-600" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {copied ? tCommon("copied") : t("copyResults")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmitter}
            disabled={validUrls.length === 0}
            className="h-11 flex-1 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
          >
            {t("openSubmitter")}
          </Button>
        </div>
      </section>
    </div>
  );
}
