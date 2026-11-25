🌍 *[English](README.md) ∙ [简体中文](README_zh.md) ∙ [日本語](README_ja.md)*

# submitnow

A free, multilingual web workbench, browser-first SEO toolkit, and zero-dependency CLI & MCP server for submitting URL batches via **IndexNow** to Bing (Microsoft Copilot & ChatGPT Search discovery), Yandex, Seznam.cz, Naver, and Yep.

## Features

- **Multi-endpoint IndexNow submission**: Target `api.indexnow.org` (default), Bing, Yandex, Seznam.cz, Naver, or Yep, with automatic sequential batching for lists over 10,000 URLs
- **Live sitemap & sitemap-index import**: Fetch remote `sitemap.xml`, `.xml.gz`, and nested `<sitemapindex>` files with optional `lastmod` filtering (24h / 7d / 30d)
- **Six browser-first utilities**: Key Generator, SSRF-guarded Key File Checker, URL Normalizer, Batch Builder (10,000-URL chunking), Sitemap Diff (added / changed / removed), and Code Generator (`curl`, JavaScript, Python, Go, GitHub Actions, JSON)
- **Local multi-site profiles & exportable history**: Opt-in browser `localStorage` profiles, per-host sitemap baselines, one-click reload/retry, and CSV/JSON history exports
- **Zero-dependency CLI & MCP server**: Run `pnpm cli` or connect `pnpm mcp` to Claude Code, Cursor, or Antigravity
- **Privacy & security hardened**: No server database persistence, SSRF protection on outbound fetches, HMAC-signed newsletter unsubscribe tokens, and per-IP rate limiting (Upstash Redis + production in-memory fallback)
- **Multilingual UI & documentation**: English, Simplified Chinese, and Japanese

## Prerequisites

- Node.js 22+
- pnpm (recommended)

## Quick start

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

Open `http://localhost:3000`.

## CLI & MCP Server

```bash
# CLI usage
pnpm cli -- --help
node cli/submitnow.ts check-key --host www.example.com --key "$INDEXNOW_KEY"
node cli/submitnow.ts submit --sitemap https://www.example.com/sitemap.xml --lastmod-days 7 --key "$INDEXNOW_KEY" --dry-run

# MCP stdio server (for Claude Code / Cursor / Antigravity)
node mcp/server.ts
```

## Testing & Verification

```bash
pnpm test
pnpm lint
pnpm build
```

## License

MIT
