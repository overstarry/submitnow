import JsonLd from "@/components/seo/JsonLd";
import { Link } from "@/i18n/routing";
import { Locale, LOCALES } from "@/i18n/routing";
import { getDocs } from "@/lib/docs";
import { constructMetadata } from "@/lib/metadata";
import {
  absoluteUrl,
  breadcrumbSchema,
  buildGraph,
  organizationSchema,
} from "@/lib/structured-data";
import { ArrowRight, BookOpen, CircleAlert, PlugZap } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Params = Promise<{ locale: string }>;

const CATEGORY_ICONS = {
  guide: BookOpen,
  "status-code": CircleAlert,
  integration: PlugZap,
};

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Docs" });
  return constructMetadata({
    page: "Docs",
    title: t("metaTitle"),
    description: t("metaDescription"),
    keywords: t.raw("keywords") as string[],
    locale: locale as Locale,
    path: "/docs",
    canonicalUrl: "/docs",
  });
}

export default async function DocsPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Docs" });
  const docs = getDocs(locale);

  const jsonLd = buildGraph([
    organizationSchema(),
    {
      "@type": "CollectionPage",
      "@id": `${absoluteUrl(locale, "/docs")}#collection`,
      name: t("title"),
      description: t("description"),
      url: absoluteUrl(locale, "/docs"),
      inLanguage: locale,
    },
    breadcrumbSchema(locale, [
      { name: t("home"), path: "/" },
      { name: t("title"), path: "/docs" },
    ]),
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="w-full bg-slate-50 py-14 dark:bg-slate-950 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl dark:text-white">
              {t("title")}
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">
              {t("description")}
            </p>
          </div>

          {(["guide", "status-code", "integration"] as const).map((category) => {
            const Icon = CATEGORY_ICONS[category];
            const categoryDocs = docs.filter((doc) => doc.category === category);
            return (
              <section key={category} className="mt-12">
                <div className="flex items-center gap-3">
                  <Icon className="size-5 text-blue-600 dark:text-blue-300" aria-hidden="true" />
                  <h2 className="font-heading text-2xl font-semibold text-slate-950 dark:text-white">
                    {t(`categories.${category}`)}
                  </h2>
                </div>
                <div className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/60">
                  {categoryDocs.map((doc) => (
                    <Link
                      key={doc.slug}
                      href={`/docs/${doc.slug}`}
                      className="group flex items-start justify-between gap-6 px-5 py-5 transition-colors hover:bg-blue-50/60 dark:hover:bg-blue-500/10 sm:px-6"
                    >
                      <span>
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {doc.title}
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {doc.summary}
                        </span>
                      </span>
                      <ArrowRight className="mt-1 size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-600" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}
