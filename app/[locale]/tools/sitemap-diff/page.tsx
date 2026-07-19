import SitemapDiff from "@/components/tools/SitemapDiff";
import { Locale, LOCALES } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Tools.sitemapDiff" });

  return constructMetadata({
    page: "Tools",
    title: t("metaTitle"),
    description: t("description"),
    locale: locale as Locale,
    path: "/tools/sitemap-diff",
    canonicalUrl: "/tools/sitemap-diff",
  });
}

export default function SitemapDiffPage() {
  return <SitemapDiff />;
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}
