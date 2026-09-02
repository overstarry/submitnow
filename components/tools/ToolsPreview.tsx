"use client";

import { Link as I18nLink } from "@/i18n/routing";
import { TOOLS } from "@/lib/tools";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ToolsPreview() {
  const t = useTranslations("Tools");

  return (
    <section className="mt-14 border-t border-slate-200/80 pt-12 dark:border-slate-800/80">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-200">
            {t("preview.eyebrow")}
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {t("preview.title")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t("preview.description")}
          </p>
        </div>
        <I18nLink
          href="/tools"
          className="inline-flex items-center gap-2 self-start rounded-xl px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-500/10 sm:self-auto"
        >
          {t("allTools")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </I18nLink>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;

          return (
            <I18nLink
              key={tool.id}
              href={tool.href}
              className="group cursor-pointer rounded-2xl border border-slate-200 bg-white/75 p-5 shadow-sm transition-colors hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-blue-500/50"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-500/10 dark:text-blue-200 dark:group-hover:bg-blue-500 dark:group-hover:text-slate-950">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-semibold text-slate-950 dark:text-white">
                {t(`cards.${tool.id}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t(`cards.${tool.id}.shortDescription`)}
              </p>
            </I18nLink>
          );
        })}
      </div>
    </section>
  );
}
