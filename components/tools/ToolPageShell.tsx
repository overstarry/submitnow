import JsonLd from "@/components/seo/JsonLd";
import ToolArticle from "@/components/tools/ToolArticle";
import { Link as I18nLink } from "@/i18n/routing";
import { getTool, type ToolId } from "@/lib/tools";
import {
  breadcrumbSchema,
  buildGraph,
  faqPageSchema,
  howToSchema,
  organizationSchema,
  softwareApplicationSchema,
} from "@/lib/structured-data";
import { ArrowLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

type FaqItem = { question: string; answer: string };
type StepItem = { title: string; description: string };

type ToolPageShellProps = {
  locale: string;
  toolId: ToolId;
  children: ReactNode;
};

export default async function ToolPageShell({
  locale,
  toolId,
  children,
}: ToolPageShellProps) {
  const tool = getTool(toolId);
  const Icon = tool.icon;

  const t = await getTranslations({ locale, namespace: `Tools.${toolId}` });
  const tCommon = await getTranslations({ locale, namespace: "Tools.common" });
  const tTools = await getTranslations({ locale, namespace: "Tools" });

  const title = t("title");
  const description = t("description");

  const faq = t.raw("article.faq.items") as FaqItem[];
  const steps = t.raw("article.howTo.steps") as StepItem[];

  const jsonLd = buildGraph([
    organizationSchema(),
    softwareApplicationSchema({
      locale,
      path: tool.href,
      name: t("metaTitle"),
      description,
    }),
    howToSchema({
      name: t("article.howTo.title"),
      steps: steps.map((step) => `${step.title}: ${step.description}`),
    }),
    faqPageSchema(faq),
    breadcrumbSchema(locale, [
      { name: tTools("breadcrumbHome"), path: "/" },
      { name: tTools("breadcrumbTools"), path: "/tools" },
      { name: t("title"), path: tool.href },
    ]),
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-slate-50 via-white to-blue-50/70 py-12 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/70 sm:py-16">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-200/45 blur-3xl dark:bg-blue-500/10"
          aria-hidden="true"
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <nav
            aria-label={tTools("breadcrumbLabel")}
            className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400"
          >
            <I18nLink
              href="/"
              className="rounded-lg px-2 py-1 transition-colors hover:bg-white hover:text-slate-950 dark:hover:bg-slate-900 dark:hover:text-white"
            >
              {tTools("breadcrumbHome")}
            </I18nLink>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <I18nLink
              href="/tools"
              className="rounded-lg px-2 py-1 transition-colors hover:bg-white hover:text-slate-950 dark:hover:bg-slate-900 dark:hover:text-white"
            >
              {tTools("breadcrumbTools")}
            </I18nLink>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <span className="px-2 py-1 font-medium text-slate-700 dark:text-slate-200">
              {title}
            </span>
          </nav>

          <div className="mt-6 max-w-3xl">
            <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-blue-200/80 bg-white text-blue-600 shadow-sm dark:border-blue-500/30 dark:bg-slate-900 dark:text-blue-200">
              <Icon className="size-6" aria-hidden="true" />
            </span>
            <h1 className="mt-5 font-heading text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl dark:text-white">
              {title}
            </h1>
            <p className="mt-4 text-pretty text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
              {description}
            </p>
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-slate-200">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-300"
              aria-hidden="true"
            />
            <p>{t("privacyNote")}</p>
          </div>

          <div className="mt-8">{children}</div>

          <ToolArticle locale={locale} toolId={toolId} />

          <div className="mt-12">
            <I18nLink
              href="/tools"
              className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {tCommon("backToTools")}
            </I18nLink>
          </div>
        </div>
      </section>
    </>
  );
}
