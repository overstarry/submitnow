import JsonLd from "@/components/seo/JsonLd";
import ToolsHub from "@/components/tools/ToolsHub";
import { Locale, LOCALES } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import {
  absoluteUrl,
  breadcrumbSchema,
  buildGraph,
  organizationSchema,
} from "@/lib/structured-data";
import { TOOLS } from "@/lib/tools";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Tools" });

  return constructMetadata({
    page: "Tools",
    title: t("metaTitle"),
    description: t("metaDescription"),
    keywords: t.raw("keywords") as string[],
    locale: locale as Locale,
    path: "/tools",
    canonicalUrl: "/tools",
  });
}

export default async function ToolsPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Tools" });

  const jsonLd = buildGraph([
    organizationSchema(),
    {
      "@type": "CollectionPage",
      "@id": `${absoluteUrl(locale, "/tools")}#collection`,
      name: t("title"),
      description: t("description"),
      url: absoluteUrl(locale, "/tools"),
      inLanguage: locale,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: TOOLS.map((tool, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: t(`cards.${tool.id}.title`),
          description: t(`cards.${tool.id}.shortDescription`),
          url: absoluteUrl(locale, tool.href),
        })),
      },
    },
    breadcrumbSchema(locale, [
      { name: t("breadcrumbHome"), path: "/" },
      { name: t("breadcrumbTools"), path: "/tools" },
    ]),
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <ToolsHub />
    </>
  );
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}
