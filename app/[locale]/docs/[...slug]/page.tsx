import JsonLd from "@/components/seo/JsonLd";
import { Link, Locale, LOCALES } from "@/i18n/routing";
import { getDoc, getDocs } from "@/lib/docs";
import { constructMetadata } from "@/lib/metadata";
import {
  breadcrumbSchema,
  buildGraph,
  organizationSchema,
  techArticleSchema,
} from "@/lib/structured-data";
import { getTool } from "@/lib/tools";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

type Params = Promise<{ locale: string; slug: string[] }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const path = slug.join("/");
  const doc = getDoc(locale, path);
  if (!doc) {
    return constructMetadata({
      page: "Docs",
      title: "404",
      description: "Page not found",
      noIndex: true,
      locale: locale as Locale,
    });
  }
  return constructMetadata({
    page: "Docs",
    title: doc.title,
    description: doc.description,
    keywords: doc.keywords,
    locale: locale as Locale,
    path: `/docs/${doc.slug}`,
    canonicalUrl: `/docs/${doc.slug}`,
    type: "article",
    publishedTime: new Date(doc.publishedAt).toISOString(),
    modifiedTime: new Date(doc.updatedAt).toISOString(),
    tags: doc.keywords,
  });
}

export default async function DocPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const doc = getDoc(locale, slug.join("/"));
  if (!doc) notFound();

  const t = await getTranslations({ locale, namespace: "Docs" });
  const tTools = await getTranslations({ locale, namespace: "Tools" });
  const relatedDocs = doc.relatedSlugs
    .map((relatedSlug) => getDoc(locale, relatedSlug))
    .filter((item) => item !== null);
  const relatedTools = (doc.relatedTools ?? []).map((toolId) => getTool(toolId));

  const jsonLd = buildGraph([
    organizationSchema(),
    techArticleSchema({
      locale,
      path: `/docs/${doc.slug}`,
      title: doc.title,
      description: doc.description,
      datePublished: doc.publishedAt,
      dateModified: doc.updatedAt,
    }),
    breadcrumbSchema(locale, [
      { name: t("home"), path: "/" },
      { name: t("title"), path: "/docs" },
      { name: doc.title, path: `/docs/${doc.slug}` },
    ]),
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="w-full bg-white py-12 dark:bg-slate-950 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-8">
          <article className="min-w-0 max-w-3xl">
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400"
            >
              <Link
                href="/"
                className="rounded-lg px-1.5 py-0.5 transition-colors hover:text-slate-950 dark:hover:text-white"
              >
                {t("home")}
              </Link>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <Link
                href="/docs"
                className="rounded-lg px-1.5 py-0.5 transition-colors hover:text-slate-950 dark:hover:text-white"
              >
                {t("title")}
              </Link>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <span className="px-1.5 py-0.5 font-medium text-slate-700 dark:text-slate-200">
                {doc.title}
              </span>
            </nav>

            <h1 className="mt-6 text-balance font-heading text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl dark:text-white">
              {doc.title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">
              {doc.description}
            </p>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              <time dateTime={doc.updatedAt}>
                {t("updated", {
                  date: new Intl.DateTimeFormat(locale, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(doc.updatedAt)),
                })}
              </time>
            </p>

            <div className="mt-12 space-y-12">
              {doc.sections.map((section) => (
                <section key={section.title}>
                  <h2 className="scroll-mt-24 font-heading text-2xl font-semibold text-slate-950 dark:text-white">
                    {section.title}
                  </h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="mt-4 text-base leading-8 text-slate-700 dark:text-slate-300"
                    >
                      {paragraph}
                    </p>
                  ))}
                  {section.items && (
                    <dl className="mt-5 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                      {section.items.map((item) => (
                        <div key={item.title} className="py-4">
                          <dt className="font-semibold text-slate-950 dark:text-white">
                            {item.title}
                          </dt>
                          <dd className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {item.description}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {section.code && (
                    <pre className="mt-5 overflow-x-auto rounded-2xl bg-slate-950 p-5 text-xs leading-6 text-slate-200">
                      <code>{section.code}</code>
                    </pre>
                  )}
                </section>
              ))}
            </div>

            <div className="mt-12 border-t border-slate-200 pt-6 dark:border-slate-800">
              <Link
                href="/docs"
                className="group inline-flex items-center gap-2 rounded-xl px-2 py-1.5 -ml-2 text-sm font-medium text-slate-600 transition-[transform,color] duration-150 ease-out-strong hover:text-blue-700 active:scale-[0.98] dark:text-slate-300 dark:hover:text-blue-300"
              >
                <ArrowLeft className="size-4 transition-transform duration-150 ease-out-strong group-hover:-translate-x-0.5" aria-hidden="true" />
                {t("back")}
              </Link>
            </div>
          </article>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {relatedTools.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                <h2 className="font-heading text-lg font-semibold text-slate-950 dark:text-white">
                  {tTools("relatedToolsTitle")}
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {relatedTools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <li key={tool.id}>
                        <Link
                          href={tool.href}
                          className="group flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-white dark:hover:bg-slate-800"
                        >
                          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200">
                            <Icon className="size-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-slate-950 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-200">
                              {tTools(`cards.${tool.id}.title`)}
                            </span>
                            <span className="mt-0.5 block text-xs leading-5 text-slate-600 dark:text-slate-400">
                              {tTools(`cards.${tool.id}.shortDescription`)}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
              <h2 className="font-heading text-lg font-semibold text-slate-950 dark:text-white">
                {t("related")}
              </h2>
              <ul className="mt-4 space-y-3">
                {relatedDocs.map((related) => (
                  <li key={related.slug}>
                    <Link
                      href={`/docs/${related.slug}`}
                      className="group flex items-start justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-[transform,background-color,color] duration-150 ease-out-strong hover:bg-white hover:text-blue-700 active:scale-[0.985] dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-200"
                    >
                      {related.title}
                      <ArrowRight
                        className="mt-0.5 size-3.5 shrink-0 transition-transform duration-150 ease-out-strong group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    getDocs(locale).map((doc) => ({
      locale,
      slug: doc.slug.split("/"),
    }))
  );
}
