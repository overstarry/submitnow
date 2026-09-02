import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const defaultLocaleRoutes = [
      "",
      "about",
      "blog",
      "docs",
      "privacy-policy",
      "terms-of-service",
      "tools",
      "unsubscribe",
    ];

    return {
      afterFiles: defaultLocaleRoutes.map((route) => ({
        source: route ? `/${route}/:path*` : "/",
        destination: route ? `/en/${route}/:path*` : "/en",
      })),
    };
  },
  images: {
    remotePatterns: [
      ...(process.env.R2_PUBLIC_URL
        ? [
            {
              hostname: process.env.R2_PUBLIC_URL.replace("https://", ""),
            },
          ]
        : []),
    ],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error"],
          }
        : false,
  },
};

export default withNextIntl(nextConfig);
