import type { Locale } from "@/i18n/routing";
import type { ToolId } from "@/lib/tools";

export type DocSection = {
  title: string;
  paragraphs?: string[];
  items?: { title: string; description: string }[];
  code?: string;
};

export type DocDefinition = {
  locale: Locale;
  slug: string;
  category: "guide" | "status-code" | "integration";
  title: string;
  description: string;
  summary: string;
  keywords: string[];
  publishedAt: string;
  updatedAt: string;
  statusCode?: number;
  platform?: string;
  sections: DocSection[];
  relatedSlugs: string[];
  relatedTools?: ToolId[];
};
