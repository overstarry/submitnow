import ToolsHub from "@/components/tools/ToolsHub";
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
  const t = await getTranslations({ locale, namespace: "Tools" });

  return constructMetadata({
    page: "Tools",
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: "/tools",
    canonicalUrl: "/tools",
  });
}

export default function ToolsPage() {
  return <ToolsHub />;
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}
