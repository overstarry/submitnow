import JsonLd from "@/components/seo/JsonLd";
import { Link } from "@/i18n/routing";
import { Locale, LOCALES } from "@/i18n/routing";
import { getDoc, getDocs } from "@/lib/docs";
import { constructMetadata } from "@/lib/metadata";
import {
  breadcrumbSchema,
  buildGraph,
  organizationSchema,
  techArticleSchema,
} from "@/lib/structured-data";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
      title: "404",
      description: "Page not found",
      noIndex: true,
      locale: locale as Locale,
      path: `/docs/${path}`,
      canonicalUrl: `/docs/${path}`,
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
  });
}

export default async function DocPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const doc = getDoc(locale, slug.join("/"));
  if (!doc) notFound();

  const t = await getTranslations({ locale, namespace: "Docs" });
  const relatedDocs = doc.relatedSlugs
    .map((relatedSlug) => getDoc(locale, relatedSlug))
    .filter((item) => item !== null);

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
      <main className="bg-white py-12 dark:bg-slate-950 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-8">
          <article className="min-w-0 max-w-3xl">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {t("back")}
            </Link>
            <h1 className="mt-7 text-balance font-heading text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl dark:text-white">
              {doc.title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">
              {doc.description}
            </p>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              {t("updated", {
                date: new Intl.DateTimeFormat(locale, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  timeZone: "UTC",
                }).format(new Date(doc.updatedAt)),
              })}
            </p>

            <div className="mt-12 space-y-12">
              {doc.sections.map((section) => (
                <section key={section.title}>
                  <h2 className="scroll-mt-24 font-heading text-2xl font-semibold text-slate-950 dark:text-white">
                    {section.title}
                  </h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="mt-4 text-base leading-8 text-slate-700 dark:text-slate-300">
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
          </article>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
              <h2 className="font-heading text-lg font-semibold text-slate-950 dark:text-white">
                {t("related")}
              </h2>
              <ul className="mt-4 space-y-3">
                {relatedDocs.map((related) => (
                  <li key={related.slug}>
                    <Link
                      href={`/docs/${related.slug}`}
                      className="group flex items-start justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-200"
                    >
                      {related.title}
                      <ArrowRight className="mt-0.5 size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>
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
