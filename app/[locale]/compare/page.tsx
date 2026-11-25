import JsonLd from "@/components/seo/JsonLd";
import { Link as I18nLink, Locale, LOCALES } from "@/i18n/routing";
import { getCompareContent } from "@/lib/compare";
import { constructMetadata } from "@/lib/metadata";
import {
  absoluteUrl,
  breadcrumbSchema,
  buildGraph,
  faqPageSchema,
  organizationSchema,
} from "@/lib/structured-data";
import { ArrowRight, CheckCircle2, ChevronRight, Scale } from "lucide-react";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const data = getCompareContent(locale);

  return constructMetadata({
    page: "Compare",
    title: data.metaTitle,
    description: data.metaDescription,
    keywords: data.keywords,
    locale: locale as Locale,
    path: "/compare",
    canonicalUrl: "/compare",
  });
}

export default async function ComparePage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = getCompareContent(locale);

  const jsonLd = buildGraph([
    organizationSchema(),
    {
      "@type": "WebPage",
      "@id": `${absoluteUrl(locale, "/compare")}#webpage`,
      url: absoluteUrl(locale, "/compare"),
      name: data.metaTitle,
      description: data.metaDescription,
      inLanguage: locale,
      dateModified: data.updatedAt,
      isPartOf: { "@id": `${absoluteUrl("en", "/")}/#website` },
    },
    faqPageSchema(data.faq),
    breadcrumbSchema(locale, [
      { name: data.breadcrumbs.home, path: "/" },
      { name: data.breadcrumbs.current, path: "/compare" },
    ]),
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-slate-50 via-white to-blue-50/70 py-12 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/70 sm:py-16">
        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400"
          >
            <I18nLink
              href="/"
              className="rounded-lg px-2 py-1 transition-colors hover:bg-white hover:text-slate-950 dark:hover:bg-slate-900 dark:hover:text-white"
            >
              {data.breadcrumbs.home}
            </I18nLink>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <span className="px-2 py-1 font-medium text-slate-700 dark:text-slate-200">
              {data.breadcrumbs.current}
            </span>
          </nav>

          <div className="mt-6 max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 shadow-sm dark:border-blue-500/30 dark:bg-slate-900/70 dark:text-blue-200">
              <Scale className="size-3.5" aria-hidden="true" />
              {data.badge}
            </div>
            <h1 className="mt-5 text-balance font-heading text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl dark:text-white">
              {data.title}
            </h1>
          </div>

          <div className="mt-6 max-w-4xl rounded-3xl border border-blue-200/80 bg-blue-50/70 p-6 shadow-sm dark:border-blue-500/30 dark:bg-blue-500/10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-200">
              {data.shortAnswerLabel}
            </p>
            <p className="mt-2 text-base leading-7 text-slate-800 dark:text-slate-100">
              {data.shortAnswer}
            </p>
          </div>

          <section className="mt-14">
            <div className="max-w-3xl">
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
                {data.matrix.title}
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
                {data.matrix.intro}
              </p>
            </div>

            <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
              <table className="w-full min-w-[840px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                    {data.matrix.headers.map((header) => (
                      <th key={header} scope="col" className="px-4 py-3.5 font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {data.matrix.rows.map((row, rowIndex) => (
                    <tr
                      key={row[0]}
                      className={
                        rowIndex === 0
                          ? "align-top bg-blue-50/40 dark:bg-blue-500/10"
                          : "align-top"
                      }
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`${row[0]}-${cellIndex}`}
                          className={
                            cellIndex === 0
                              ? "px-4 py-4 font-semibold text-slate-950 dark:text-white"
                              : "px-4 py-4 leading-6 text-slate-700 dark:text-slate-300"
                          }
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="mt-14 space-y-12 max-w-4xl">
            {data.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
                  {section.heading}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-4 text-base leading-7 text-slate-700 dark:text-slate-300"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-6 grid gap-4 sm:grid-cols-3">
                    {section.bullets.map((item) => (
                      <li
                        key={item.label}
                        className="rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
                      >
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2
                            className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-300"
                            aria-hidden="true"
                          />
                          <div>
                            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                              {item.label}
                            </h3>
                            <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                              {item.detail}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <section className="mt-14">
            <div className="max-w-3xl">
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
                {data.scenarios.title}
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
                {data.scenarios.intro}
              </p>
            </div>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                    {data.scenarios.headers.map((header) => (
                      <th key={header} scope="col" className="px-4 py-3.5 font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {data.scenarios.rows.map((row) => (
                    <tr key={row[0]} className="align-top">
                      {row.map((cell, index) => (
                        <td
                          key={`${row[0]}-${index}`}
                          className={
                            index === 0
                              ? "px-4 py-4 font-semibold text-slate-950 dark:text-white"
                              : "px-4 py-4 leading-6 text-slate-700 dark:text-slate-300"
                          }
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-14 max-w-4xl">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
              {data.faqTitle}
            </h2>
            <dl className="mt-6 space-y-4">
              {data.faq.map((item) => (
                <div
                  key={item.question}
                  className="rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <dt className="font-semibold text-slate-950 dark:text-white">
                    {item.question}
                  </dt>
                  <dd className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-14 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <h2 className="font-heading text-2xl font-semibold text-slate-950 dark:text-white">
              {data.cta.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {data.cta.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <I18nLink
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                {data.cta.primaryLabel}
                <ArrowRight className="size-4" aria-hidden="true" />
              </I18nLink>
              <I18nLink
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {data.cta.secondaryLabel}
              </I18nLink>
              <I18nLink
                href="/docs/integrations/cli-and-mcp"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {data.cta.tertiaryLabel}
              </I18nLink>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}
