import JsonLd from "@/components/seo/JsonLd";
import { Link as I18nLink, Locale, LOCALES } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import { getPricingContent } from "@/lib/pricing";
import {
  absoluteUrl,
  breadcrumbSchema,
  buildGraph,
  faqPageSchema,
  organizationSchema,
  softwareApplicationSchema,
} from "@/lib/structured-data";
import { ArrowRight, Check, ChevronRight, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const data = getPricingContent(locale);

  return constructMetadata({
    page: "Pricing",
    title: data.metaTitle,
    description: data.metaDescription,
    keywords: data.keywords,
    locale: locale as Locale,
    path: "/pricing",
    canonicalUrl: "/pricing",
  });
}

export default async function PricingPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = getPricingContent(locale);

  const jsonLd = buildGraph([
    organizationSchema(),
    softwareApplicationSchema({
      locale,
      path: "/pricing",
      name: "submitnow",
      description: data.metaDescription,
      featureList: data.tiers.flatMap((tier) => tier.highlights),
    }),
    {
      "@type": "WebPage",
      "@id": `${absoluteUrl(locale, "/pricing")}#webpage`,
      url: absoluteUrl(locale, "/pricing"),
      name: data.metaTitle,
      description: data.metaDescription,
      inLanguage: locale,
      dateModified: data.updatedAt,
      isPartOf: { "@id": `${absoluteUrl("en", "/")}/#website` },
    },
    faqPageSchema(data.faq),
    breadcrumbSchema(locale, [
      { name: data.breadcrumbs.home, path: "/" },
      { name: data.breadcrumbs.current, path: "/pricing" },
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
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 shadow-sm dark:border-emerald-500/30 dark:bg-slate-900/70 dark:text-emerald-200">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
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

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {data.tiers.map((tier, index) => (
              <div
                key={tier.id}
                className={
                  index === 0
                    ? "flex flex-col rounded-3xl border-2 border-blue-500/70 bg-white/95 p-8 shadow-sm dark:border-blue-500/50 dark:bg-slate-950/80"
                    : "flex flex-col rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950/70"
                }
              >
                <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {tier.badge}
                </span>
                <h2 className="mt-4 font-heading text-2xl font-semibold text-slate-950 dark:text-white">
                  {tier.name}
                </h2>
                <div className="mt-4 flex items-baseline gap-2.5">
                  <span className="font-heading text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
                    {tier.price}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {tier.priceNote}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {tier.summary}
                </p>
                <ul className="mt-6 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                  {tier.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check
                        className="mt-1 size-4 shrink-0 text-emerald-600 dark:text-emerald-300"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  {tier.external ? (
                    <a
                      href={tier.ctaHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      {tier.ctaLabel}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </a>
                  ) : (
                    <I18nLink
                      href={tier.ctaHref}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                      {tier.ctaLabel}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </I18nLink>
                  )}
                </div>
              </div>
            ))}
          </div>

          <section className="mt-14">
            <div className="max-w-3xl">
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
                {data.quotasTable.title}
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
                {data.quotasTable.intro}
              </p>
            </div>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                    {data.quotasTable.headers.map((header) => (
                      <th key={header} scope="col" className="px-4 py-3.5 font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {data.quotasTable.rows.map((row) => (
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
              {data.boundarySection.heading}
            </h2>
            {data.boundarySection.paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="mt-4 text-base leading-7 text-slate-700 dark:text-slate-300"
              >
                {paragraph}
              </p>
            ))}
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
                href="/compare"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {data.cta.secondaryLabel}
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
