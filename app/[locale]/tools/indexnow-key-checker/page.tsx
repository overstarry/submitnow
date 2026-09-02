import IndexNowKeyChecker from "@/components/tools/IndexNowKeyChecker";
import ToolPageShell from "@/components/tools/ToolPageShell";
import { Locale, LOCALES } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Tools.keyChecker" });

  return constructMetadata({
    page: "Tools",
    title: t("metaTitle"),
    description: t("metaDescription"),
    keywords: t.raw("keywords") as string[],
    locale: locale as Locale,
    path: "/tools/indexnow-key-checker",
    canonicalUrl: "/tools/indexnow-key-checker",
  });
}

export default async function IndexNowKeyCheckerPage({
  params,
}: {
  params: Params;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <ToolPageShell locale={locale} toolId="keyChecker">
      <IndexNowKeyChecker />
    </ToolPageShell>
  );
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}
