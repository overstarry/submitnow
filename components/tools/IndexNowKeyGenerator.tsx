"use client";

import ToolPageShell from "@/components/tools/ToolPageShell";
import { Button } from "@/components/ui/button";
import {
  Check,
  Copy,
  Download,
  FileKey2,
  RefreshCw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  copyText,
  downloadTextFile,
  generateIndexNowKey,
} from "@/lib/seo-tools";

type CopyState = "idle" | "copied" | "failed";

export default function IndexNowKeyGenerator() {
  const t = useTranslations("Tools.keyGenerator");
  const tCommon = useTranslations("Tools.common");
  const [key, setKey] = useState("");
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const handleGenerate = () => {
    setKey(generateIndexNowKey());
    setCopyState("idle");
  };

  const handleCopy = async () => {
    const didCopy = await copyText(key);
    setCopyState(didCopy ? "copied" : "failed");
  };

  const handleDownload = () => {
    if (!key) return;
    downloadTextFile(`${key}.txt`, key);
  };

  return (
    <ToolPageShell
      icon={FileKey2}
      title={t("title")}
      description={t("description")}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold text-slate-950 dark:text-white">
                {t("keyLabel")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t("keyHelp")}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleGenerate}
              className="h-10 rounded-xl bg-blue-600 px-4 font-semibold text-white hover:bg-blue-700"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              {key ? t("generateAgain") : t("generate")}
            </Button>
          </div>

          <label htmlFor="generated-indexnow-key" className="sr-only">
            {t("keyLabel")}
          </label>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
            <input
              id="generated-indexnow-key"
              value={key}
              readOnly
              placeholder={t("keyPlaceholder")}
              className="w-full bg-transparent px-3 py-2 font-mono text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              disabled={!key}
              className="h-11 flex-1 rounded-xl border-slate-200 bg-white font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {copyState === "copied" ? (
                <Check className="size-4 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {copyState === "copied" ? tCommon("copied") : tCommon("copy")}
            </Button>
            <Button
              type="button"
              onClick={handleDownload}
              disabled={!key}
              className="h-11 flex-1 rounded-xl bg-slate-950 font-semibold text-white hover:bg-slate-800 dark:bg-blue-500 dark:text-slate-950 dark:hover:bg-blue-400"
            >
              <Download className="size-4" aria-hidden="true" />
              {t("download")}
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
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 dark:border-slate-800 dark:bg-slate-900/50">
          <h2 className="font-heading text-lg font-semibold text-slate-950 dark:text-white">
            {t("stepsTitle")}
          </h2>
          <ol className="mt-5 space-y-4">
            {["generateStep", "hostStep", "submitStep"].map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-100">
                  {index + 1}
                </span>
                <span>{t(`steps.${step}`)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm leading-6 text-slate-600 dark:border-blue-500/20 dark:bg-slate-950/70 dark:text-slate-300">
            {t("rootFileNote")}
          </p>
        </aside>
      </div>
    </ToolPageShell>
  );
}
