import HomeComponent from "@/components/home";
import JsonLd from "@/components/seo/JsonLd";
import { Locale, LOCALES } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import {
  absoluteUrl,
  buildGraph,
  faqPageSchema,
  howToSchema,
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
} from "@/lib/structured-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Params = Promise<{ locale: string }>;

type FaqItem = { question: string; answer: string };
type Step = { title: string; description: string };

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });

  return constructMetadata({
    page: "Home",
    title: t("title"),
    description: t("description"),
    keywords: t.raw("keywords") as string[],
    locale: locale as Locale,
    path: "/",
    canonicalUrl: "/",
  });
}

export default async function Home({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Home" });

  const jsonLd = buildGraph([
    organizationSchema(),
    websiteSchema(locale, t("description")),
    softwareApplicationSchema({
      locale,
      path: "/",
      name: `${t("title")} — ${t("tagLine")}`,
      description: t("description"),
      featureList: [
        "Multi-endpoint IndexNow submission (api.indexnow.org, Bing, Yandex, Seznam.cz, Naver, Yep)",
        "Live XML sitemap, .xml.gz, and nested sitemap-index import with lastmod filtering",
        "Automatic sequential batching for lists over 10,000 same-host URLs",
        "Pre-flight public key file diagnostics (404, soft-404 HTML, UTF-8 BOM, off-host redirects)",
        "Six browser-first IndexNow utilities with zero server database storage",
        "Hosted Streamable HTTP MCP endpoint (/mcp), local npx stdio MCP server, and zero-dependency CLI for AI coding agents",
      ],
    }),
    howToSchema({
      name: t("howItWorks.title"),
      steps: (t.raw("howItWorks.steps") as Step[]).map(
        (step) => `${step.title}: ${step.description}`
      ),
    }),
    faqPageSchema(t.raw("faq.items") as FaqItem[]),
    {
      "@type": "WebPage",
      "@id": `${absoluteUrl(locale, "/")}/#webpage`,
      url: absoluteUrl(locale, "/"),
      name: t("title"),
      description: t("description"),
      inLanguage: locale,
      isPartOf: { "@id": `${absoluteUrl("en", "/")}/#website` },
    },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <HomeComponent />
    </>
  );
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}
