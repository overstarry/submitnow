"use client";

import { submitIndexNow } from "@/actions/indexnow";
import { Button } from "@/components/ui/button";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  Loader2,
  Send,
} from "lucide-react";
import { BiLogoBing } from "react-icons/bi";
import { FaYandex } from "react-icons/fa";
import { SiNaver } from "react-icons/si";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type SubmitStatus = "idle" | "loading" | "success" | "error";

export default function IndexNowSubmission() {
  const t = useTranslations("IndexNow");
  const supportedEngines = [
    { id: "bing", name: "Bing", icon: BiLogoBing },
    { id: "yandex", name: "Yandex", icon: FaYandex },
    { id: "seznam", name: "Seznam.cz", monogram: "SE" },
    { id: "naver", name: "Naver", icon: SiNaver },
    { id: "yep", name: "Yep", monogram: "Y" },
  ];

  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [submittedCount, setSubmittedCount] = useState<number | null>(null);
  const [submittedHost, setSubmittedHost] = useState<string | null>(null);
  const [keyLocation, setKeyLocation] = useState<string | null>(null);

  const statusMessage = useMemo(() => {
    if (status === "success") {
      if (submittedCount === null || !submittedHost || !keyLocation) {
        return t("successMessage");
      }
      return t("successMessageWithDetails", {
        count: submittedCount,
        host: submittedHost,
        keyLocation,
      });
    }
    return "";
  }, [keyLocation, status, submittedCount, submittedHost, t]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      setStatus("loading");
      setErrorMessage("");
      setSubmittedCount(null);
      setSubmittedHost(null);
      setKeyLocation(null);

      const result = await submitIndexNow(formData);
      if (!result.success) {
        const status = (result.details?.status as number | undefined) ?? 0;
        const message = result.errorCode.startsWith("bing_")
          ? t(`errors.${result.errorCode}`, { status })
          : t(`errors.${result.errorCode}`);
        throw new Error(message);
      }

      setStatus("success");
      setSubmittedCount(result.submittedCount);
      setSubmittedHost(result.host);
      setKeyLocation(result.keyLocation);
      setTimeout(() => setStatus("idle"), 7000);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : t("errors.network_error")
      );
      setTimeout(() => setStatus("idle"), 7000);
    }
  };

  return (
    <section id="indexnow-form" className="w-full scroll-mt-24">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 shadow-xl backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/70">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-blue-50 via-white to-transparent dark:from-blue-500/10 dark:via-slate-950"
          aria-hidden="true"
        />
        <div className="relative border-b border-slate-200/70 px-6 py-6 dark:border-slate-800/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-balance font-heading text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-100">
                {t("title")}
              </h2>
              <p className="mt-2 text-pretty text-sm text-slate-600 dark:text-slate-300">
                {t("description")}
              </p>
            </div>
            <div className="inline-flex items-center rounded-full border border-blue-200/80 bg-blue-50/80 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
              {t("bingOnlyNote")}
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-4 text-xs text-slate-600 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-300">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {t("supportedEnginesTitle")}
            </p>
            <p className="mt-1 text-pretty text-xs text-slate-500 dark:text-slate-400">
              {t("supportedEnginesNote")}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label={t("supportedEnginesTitle")}>
              {supportedEngines.map((engine) => {
                const Icon = engine.icon;
                return (
                  <li
                    key={engine.id}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <span className="flex size-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                      {Icon ? (
                        <Icon className="size-3.5" aria-hidden="true" />
                      ) : (
                        <span className="text-xs font-semibold">
                          {engine.monogram}
                        </span>
                      )}
                    </span>
                    <span>{engine.name}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="space-y-5">
            <div>
              <label
                htmlFor="urls"
                className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                {t("urlsLabel")}{" "}
                <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <textarea
                id="urls"
                name="urls"
                placeholder={t("urlsPlaceholder")}
                required
                rows={6}
                className="w-full resize-y rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200/70 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
                disabled={status === "loading"}
              />
              <p className="mt-2 text-pretty text-xs text-slate-500 dark:text-slate-400">
                {t("urlsHelp")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="key"
                  className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  {t("keyLabel")}{" "}
                  <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="key"
                  name="key"
                  placeholder={t("keyPlaceholder")}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200/70 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
                  disabled={status === "loading"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <p className="mt-2 text-pretty text-xs text-slate-500 dark:text-slate-400">
                  {t("keyHelp")}
                </p>
              </div>

              <div>
                <label
                  htmlFor="host"
                  className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  {t("hostLabel")}
                </label>
                <input
                  type="text"
                  id="host"
                  name="host"
                  placeholder={t("hostPlaceholder")}
                  className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200/70 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
                  disabled={status === "loading"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <p className="mt-2 text-pretty text-xs text-slate-500 dark:text-slate-400">
                  {t("hostHelp")}
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="keyLocation"
                className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                {t("keyLocationLabel")}
              </label>
                <input
                  type="url"
                  id="keyLocation"
                  name="keyLocation"
                  placeholder={t("keyLocationPlaceholder")}
                  className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200/70 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
                  disabled={status === "loading"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              <p className="mt-2 text-pretty text-xs text-slate-500 dark:text-slate-400">
                {t("keyLocationHelp", { host: "<host>", key: "<key>" })}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                disabled={status === "loading"}
                className="h-12 w-full rounded-xl bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                {status === "loading" ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    {t("submitting")}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="size-4" />
                    {t("submit")}
                  </span>
                )}
              </Button>

              <div className="flex min-h-12 items-center justify-center" aria-live="polite">
                {status === "success" && (
                  <div className="flex w-full items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700 tabular-nums dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200">
                    <CheckCircleIcon className="size-5 flex-shrink-0 mt-0.5" />
                    <span className="w-full break-words text-left text-pretty">
                      {statusMessage}
                    </span>
                  </div>
                )}
                {status === "error" && (
                  <div className="flex w-full items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                    <AlertCircleIcon className="size-5 flex-shrink-0 mt-0.5" />
                    <span className="w-full break-words text-left text-pretty">
                      {errorMessage}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
