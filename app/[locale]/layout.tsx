import BaiDuAnalytics from "@/app/BaiDuAnalytics";
import GoogleAdsense from "@/app/GoogleAdsense";
import GoogleAnalytics from "@/app/GoogleAnalytics";
import PlausibleAnalytics from "@/app/PlausibleAnalytics";
import Footer from "@/components/footer/Footer";
import Header from "@/components/header/Header";
import { LanguageDetectionAlert } from "@/components/LanguageDetectionAlert";
import { TailwindIndicator } from "@/components/TailwindIndicator";
import { siteConfig } from "@/config/site";
import { DEFAULT_LOCALE, Locale, routing } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import "@/styles/globals.css";
import "@/styles/loading.css";
import { Analytics } from "@vercel/analytics/react";
import { Metadata, Viewport } from "next";
import { Open_Sans, Poppins } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { notFound } from "next/navigation";

const headingFont = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-heading",
});

const bodyFont = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body",
});

type MetadataProps = {
  params: Promise<{ locale: string }>;
};

function pickClientMessages(messages: Record<string, unknown>) {
  const home = messages.Home as Record<string, unknown> | undefined;
  const footer = messages.Footer as Record<string, unknown> | undefined;
  const tools = messages.Tools as Record<string, unknown> | undefined;

  const trimmedTools: Record<string, unknown> = {};
  if (tools) {
    if (tools.common) trimmedTools.common = tools.common;
    for (const toolKey of [
      "keyGenerator",
      "keyChecker",
      "urlNormalizer",
      "batchBuilder",
      "sitemapDiff",
      "codeGenerator",
    ]) {
      const toolNs = tools[toolKey] as Record<string, unknown> | undefined;
      if (toolNs) {
        // Strip server-only long-form article prose and SEO metadata from
        // the client hydration payload.
        const {
          article: _article,
          keywords: _keywords,
          metaTitle: _metaTitle,
          metaDescription: _metaDescription,
          ...clientToolFields
        } = toolNs;
        trimmedTools[toolKey] = clientToolFields;
      }
    }
  }

  return {
    Header: messages.Header,
    Home: home ? { title: home.title } : undefined,
    Footer: footer?.Newsletter ? { Newsletter: footer.Newsletter } : undefined,
    IndexNow: messages.IndexNow,
    Tools: trimmedTools,
  };
}

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });

  return constructMetadata({
    page: "Home",
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
  });
}

export const viewport: Viewport = {
  themeColor: siteConfig.themeColors,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const clientMessages = pickClientMessages(messages as Record<string, unknown>);

  return (
    <html lang={locale || DEFAULT_LOCALE} suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background flex flex-col font-sans antialiased",
          headingFont.variable,
          bodyFont.variable
        )}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 rounded bg-background px-3 py-2 text-sm shadow"
        >
          Skip to content
        </a>
        <NextIntlClientProvider messages={clientMessages}>
          <ThemeProvider
            attribute="class"
            defaultTheme={siteConfig.defaultNextTheme}
            enableSystem
          >
            {messages.LanguageDetection && <LanguageDetectionAlert />}
            {messages.Header && <Header />}

            <main id="main-content" className="flex-1 flex flex-col items-center">
              {children}
            </main>

            {messages.Footer && <Footer />}
          </ThemeProvider>
        </NextIntlClientProvider>
        <TailwindIndicator />
        {process.env.NODE_ENV === "development" ? (
          <></>
        ) : (
          <>
            <Analytics />
            <BaiDuAnalytics />
            <GoogleAnalytics />
            <GoogleAdsense />
            <PlausibleAnalytics />
          </>
        )}
      </body>
    </html>
  );
}
