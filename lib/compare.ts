import enCompare from "@/content/compare/en.json";
import jaCompare from "@/content/compare/ja.json";
import zhCompare from "@/content/compare/zh.json";
import type { Locale } from "@/i18n/routing";

export type CompareTable = {
  title: string;
  intro: string;
  headers: string[];
  rows: string[][];
};

export type CompareSection = {
  heading: string;
  paragraphs: string[];
  bullets?: { label: string; detail: string }[];
};

export type CompareFaqItem = {
  question: string;
  answer: string;
};

export type ComparePageContent = {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  updatedAt: string;
  badge: string;
  title: string;
  shortAnswerLabel: string;
  shortAnswer: string;
  matrix: CompareTable;
  sections: CompareSection[];
  scenarios: CompareTable;
  faqTitle: string;
  faq: CompareFaqItem[];
  cta: {
    title: string;
    description: string;
    primaryLabel: string;
    secondaryLabel: string;
    tertiaryLabel: string;
  };
  breadcrumbs: {
    home: string;
    current: string;
  };
};

const COMPARE_BY_LOCALE: Record<Locale, ComparePageContent> = {
  en: enCompare as ComparePageContent,
  zh: zhCompare as ComparePageContent,
  ja: jaCompare as ComparePageContent,
};

export function getCompareContent(locale: string): ComparePageContent {
  const normalizedLocale: Locale =
    locale === "zh" || locale === "ja" ? locale : "en";
  return COMPARE_BY_LOCALE[normalizedLocale];
}
