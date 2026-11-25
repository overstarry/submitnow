import { Link as I18nLink } from "@/i18n/routing";
import { TOOLS } from "@/lib/tools";
import {
  ArrowRight,
  GitCompareArrows,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function ToolsHub() {
  const t = useTranslations("Tools");

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-slate-50 via-white to-blue-50/70 py-12 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/70 sm:py-16">
      <div
        className="pointer-events-none absolute left-1/2 top-[-120px] h-80 w-80 -translate-x-1/2 rounded-full bg-blue-200/45 blur-3xl dark:bg-blue-500/10"
        aria-hidden="true"
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 shadow-sm backdrop-blur dark:border-blue-500/30 dark:bg-slate-900/70 dark:text-blue-200">
            <span className="size-1.5 rounded-full bg-blue-500" aria-hidden="true" />
            {t("badge")}
          </div>
          <h1 className="mt-6 font-heading text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl dark:text-white">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
            {t("description")}
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;

            return (
              <I18nLink
                key={tool.id}
                href={tool.href}
                className="group flex min-h-64 cursor-pointer flex-col rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm transition-[transform,border-color,box-shadow,background-color] duration-200 ease-out-strong hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-blue-500/50"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-colors duration-200 ease-out-strong group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-500/10 dark:text-blue-200 dark:group-hover:bg-blue-500 dark:group-hover:text-slate-950">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <h2 className="mt-6 font-heading text-xl font-semibold text-slate-950 dark:text-white">
                  {t(`cards.${tool.id}.title`)}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {t(`cards.${tool.id}.description`)}
                </p>
                <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-blue-700 dark:text-blue-200">
                  {t("openTool")}
                  <ArrowRight className="size-4 transition-transform duration-200 ease-out-strong group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </I18nLink>
            );
          })}
        </div>

        <div className="mt-10 grid gap-4 rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <ShieldCheck className="size-4" aria-hidden="true" />
            </span>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{t("principles.local")}</p>
          </div>
          <div className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <ListChecks className="size-4" aria-hidden="true" />
            </span>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{t("principles.review")}</p>
          </div>
          <div className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <GitCompareArrows className="size-4" aria-hidden="true" />
            </span>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{t("principles.export")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
