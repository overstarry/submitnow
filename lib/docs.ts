import enDocs from "@/content/docs/en.json";
import jaDocs from "@/content/docs/ja.json";
import zhDocs from "@/content/docs/zh.json";
import type { Locale } from "@/i18n/routing";
import type { DocDefinition } from "@/types/docs";

const DOCS_BY_LOCALE: Record<Locale, DocDefinition[]> = {
  en: enDocs as DocDefinition[],
  zh: zhDocs as DocDefinition[],
  ja: jaDocs as DocDefinition[],
};

export function getDocs(locale: string): DocDefinition[] {
  const normalizedLocale: Locale =
    locale === "zh" || locale === "ja" ? locale : "en";
  return DOCS_BY_LOCALE[normalizedLocale];
}

export function getDoc(locale: string, slug: string): DocDefinition | null {
  return getDocs(locale).find((doc) => doc.slug === slug) ?? null;
}

export function getDocSlugs(): string[] {
  return Array.from(new Set(Object.values(DOCS_BY_LOCALE).flatMap((docs) => docs.map((doc) => doc.slug))));
}
