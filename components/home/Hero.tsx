import { Button } from "@/components/ui/button";

import { ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

const INDEXNOW_DOCS_URL = "https://www.indexnow.org/documentation";

export default function Hero() {
  const t = useTranslations("Home");
  const tIndexNow = useTranslations("IndexNow");

  const highlights = [
    {
      title: t("highlights.speedTitle"),
      description: t("highlights.speedDescription"),
      icon: Zap,
    },
    {
      title: t("highlights.verificationTitle"),
      description: t("highlights.verificationDescription"),
      icon: ShieldCheck,
    },
    {
      title: t("highlights.reachTitle"),
      description: t("highlights.reachDescription"),
      icon: Sparkles,
    },
  ];

  return (
    <section className="w-full text-center lg:text-left">
      <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 shadow-sm backdrop-blur dark:border-blue-500/30 dark:bg-slate-900/50 dark:text-blue-200 lg:mx-0">
        <span className="size-1.5 rounded-full bg-blue-500" aria-hidden="true" />
        {t("badge")}
      </div>
      <h1 className="mx-auto mt-6 max-w-4xl text-balance font-heading text-4xl font-semibold text-slate-900 sm:text-5xl lg:mx-0 lg:text-6xl dark:text-slate-100">
        {t("heroTitle")}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg text-slate-700 dark:text-slate-300 lg:mx-0">
        {t("description")}
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
        <Button
          className="h-11 w-full rounded-xl bg-blue-600 px-6 text-base font-semibold text-white shadow-sm hover:bg-blue-700 sm:w-auto"
          asChild
        >
          <a href="#indexnow-form">{tIndexNow("submit")}</a>
        </Button>
        <Button
          className="h-11 w-full rounded-xl border border-blue-200/80 bg-white/80 px-6 text-blue-700 shadow-sm hover:border-blue-300 hover:bg-white sm:w-auto dark:border-blue-500/30 dark:bg-slate-900/60 dark:text-blue-200 dark:hover:border-blue-500/60"
          variant="outline"
          asChild
        >
          <Link
            href={INDEXNOW_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={t("ctaDocs")}
            prefetch={false}
            className="flex items-center gap-2"
          >
            {t("ctaDocs")}
          </Link>
        </Button>

      </div>

      <div className="mt-10 grid gap-4 text-left sm:grid-cols-3">
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-4 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/60"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
