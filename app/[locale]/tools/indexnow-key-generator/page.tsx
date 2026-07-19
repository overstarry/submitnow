import IndexNowKeyGenerator from "@/components/tools/IndexNowKeyGenerator";
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
  const t = await getTranslations({ locale, namespace: "Tools.keyGenerator" });

  return constructMetadata({
    page: "Tools",
    title: t("metaTitle"),
    description: t("description"),
    locale: locale as Locale,
    path: "/tools/indexnow-key-generator",
    canonicalUrl: "/tools/indexnow-key-generator",
  });
}

export default function IndexNowKeyGeneratorPage() {
  return <IndexNowKeyGenerator />;
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}
