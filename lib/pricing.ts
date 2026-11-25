import enPricing from "@/content/pricing/en.json";
import jaPricing from "@/content/pricing/ja.json";
import zhPricing from "@/content/pricing/zh.json";
import type { Locale } from "@/i18n/routing";

export type PricingTier = {
  id: string;
  badge: string;
  name: string;
  price: string;
  priceNote: string;
  summary: string;
  highlights: string[];
  ctaLabel: string;
  ctaHref: string;
  external?: boolean;
};

export type PricingQuotaTable = {
  title: string;
  intro: string;
  headers: string[];
  rows: string[][];
};

export type PricingFaqItem = {
  question: string;
  answer: string;
};

export type PricingPageContent = {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  updatedAt: string;
  badge: string;
  title: string;
  shortAnswerLabel: string;
  shortAnswer: string;
  tiers: PricingTier[];
  quotasTable: PricingQuotaTable;
  boundarySection: {
    heading: string;
    paragraphs: string[];
  };
  faqTitle: string;
  faq: PricingFaqItem[];
  cta: {
    title: string;
    description: string;
    primaryLabel: string;
    secondaryLabel: string;
  };
  breadcrumbs: {
    home: string;
    current: string;
  };
};

const PRICING_BY_LOCALE: Record<Locale, PricingPageContent> = {
  en: enPricing as PricingPageContent,
  zh: zhPricing as PricingPageContent,
  ja: jaPricing as PricingPageContent,
};

export function getPricingContent(locale: string): PricingPageContent {
  const normalizedLocale: Locale =
    locale === "zh" || locale === "ja" ? locale : "en";
  return PRICING_BY_LOCALE[normalizedLocale];
}
