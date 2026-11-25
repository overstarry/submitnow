import { SiteConfig } from "@/types/siteConfig";

function normalizeSiteUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;

  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return undefined;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  const isLocalhost =
    lower.startsWith("localhost") ||
    lower.startsWith("127.0.0.1") ||
    lower.startsWith("0.0.0.0");

  return `${isLocalhost ? "http" : "https"}://${trimmed}`;
}

function resolveBaseUrl(): string {
  const fromPublicEnv = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (fromPublicEnv) return fromPublicEnv;

  // Avoid leaking ephemeral *.vercel.app deployment URLs into canonicals,
  // sitemaps, and JSON-LD on production deployments when NEXT_PUBLIC_SITE_URL
  // is unset.
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    return "https://www.submitnow.dev";
  }

  const fromVercelEnv = normalizeSiteUrl(process.env.VERCEL_URL);
  if (fromVercelEnv) return fromVercelEnv;

  return "http://localhost:3000";
}

export const BASE_URL = resolveBaseUrl();

export const SOURCE_CODE_URL = "https://github.com/overstarry/indexNow-gui";

const EMAIL_URL = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export const siteConfig: SiteConfig = {
  name: "submitnow",
  tagLine: "Free Open-Source IndexNow & AI Search Workbench",
  description:
    "Free, open-source (MIT) IndexNow workbench, browser toolkit, CLI, and MCP server for developers and site owners to notify Bing, ChatGPT Search, Copilot, Yandex, Seznam, Naver, and Yep — no account, zero server storage.",
  url: BASE_URL,
  authors: [
    {
      name: "ming_jiang",
      url: SOURCE_CODE_URL,
    }
  ],
  creator: "@ming_jiang",
  socialLinks: {
    github: SOURCE_CODE_URL,
    email: EMAIL_URL,
  },
  themeColors: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  defaultNextTheme: 'system', // next-theme option: system | dark | light
  icons: {
    icon: "/favicon.ico",
    shortcut: "/logo.png",
    apple: "/logo.png", // apple-touch-icon.png
  },
}
