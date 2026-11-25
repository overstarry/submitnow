import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_LOCALE, LOCALES, routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);
export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const matchedLocale = LOCALES.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  // Permanently redirect default-locale-prefixed URLs (e.g. /en, /en/tools)
  // to their canonical unprefixed paths (/, /tools) so crawlers never see
  // duplicate 200 OK pages under /en/*.
  if (matchedLocale === DEFAULT_LOCALE) {
    const targetUrl = request.nextUrl.clone();
    const stripped = pathname.slice(`/${DEFAULT_LOCALE}`.length);
    targetUrl.pathname = stripped.length > 0 ? stripped : '/';
    return NextResponse.redirect(targetUrl, 308);
  }

  if (matchedLocale && matchedLocale !== DEFAULT_LOCALE) {
    return handleI18nRouting(request);
  }

  // Next.js 16.1 can expose middleware rewrites as self-redirects in
  // production. Default-locale rewrites therefore live in next.config.mjs;
  // the proxy only provides the locale context required by next-intl.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-next-intl-locale', DEFAULT_LOCALE);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    // Enable a redirect to a matching locale at the root
    '/',

    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix
    '/(en|zh|ja)/:path*',

    // Enable redirects that add missing locales
    // (e.g. `/pathnames` -> `/en/pathnames`)
    '/((?!api|mcp|_next|_vercel|.*\\.|favicon.ico).*)'
  ]
};

