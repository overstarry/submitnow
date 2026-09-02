"use client";

import type { KeyCheckResult } from "@/actions/indexnow-key-check";
import { CheckCircle2, TriangleAlert, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

type KeyCheckReportProps = {
  result: Extract<KeyCheckResult, { success: true }>;
  /** Compact layout for the inline pre-flight check on the submission form. */
  compact?: boolean;
};

export default function KeyCheckReport({
  result,
  compact = false,
}: KeyCheckReportProps) {
  const t = useTranslations("Tools.keyChecker");

  const tone = result.valid
    ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-500/10"
    : "border-amber-200 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/10";

  const Icon = result.valid ? CheckCircle2 : TriangleAlert;

  return (
    <div className={`rounded-2xl border p-4 ${tone}`} aria-live="polite">
      <div className="flex items-start gap-3">
        <Icon
          className={`mt-0.5 size-5 shrink-0 ${
            result.valid
              ? "text-emerald-600 dark:text-emerald-300"
              : "text-amber-600 dark:text-amber-300"
          }`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 dark:text-white">
            {result.valid ? t("resultValid") : t("resultInvalid")}
          </p>

          {result.issues.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {result.issues.map((issue) => (
                <li
                  key={issue}
                  className="flex gap-2 text-sm leading-6 text-slate-700 dark:text-slate-200"
                >
                  <XCircle
                    className="mt-1 size-3.5 shrink-0 text-amber-600 dark:text-amber-300"
                    aria-hidden="true"
                  />
                  <span>
                    <strong className="font-semibold">
                      {t(`issues.${issue}.title`)}
                    </strong>{" "}
                    {t(`issues.${issue}.fix`)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {!compact && (
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-slate-700 dark:text-slate-200">
                  {t("fields.requestedUrl")}
                </dt>
                <dd className="mt-0.5 break-all font-mono text-slate-600 dark:text-slate-300">
                  {result.keyLocation}
                </dd>
              </div>
              {result.finalUrl !== result.keyLocation && (
                <div>
                  <dt className="font-semibold text-slate-700 dark:text-slate-200">
                    {t("fields.finalUrl")}
                  </dt>
                  <dd className="mt-0.5 break-all font-mono text-slate-600 dark:text-slate-300">
                    {result.finalUrl}
                  </dd>
                </div>
              )}
              <div>
                <dt className="font-semibold text-slate-700 dark:text-slate-200">
                  {t("fields.status")}
                </dt>
                <dd className="mt-0.5 font-mono text-slate-600 dark:text-slate-300">
                  {result.status}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700 dark:text-slate-200">
                  {t("fields.contentType")}
                </dt>
                <dd className="mt-0.5 break-all font-mono text-slate-600 dark:text-slate-300">
                  {result.contentType || t("fields.none")}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-semibold text-slate-700 dark:text-slate-200">
                  {t("fields.body")}
                </dt>
                <dd className="mt-0.5 break-all font-mono text-slate-600 dark:text-slate-300">
                  {result.body || t("fields.none")}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
