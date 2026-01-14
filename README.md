🌍 *[English](README.md) ∙ [简体中文](README_zh.md) ∙ [日本語](README_ja.md)*

# submitnow (Bing-only)

A multilingual web UI to submit URL batches to Bing via the IndexNow protocol.

## Features

- Submit up to 10,000 URLs per request
- Host inferred from the URL list (optional manual override)
- i18n UI (English / 中文 / 日本語)
- No persistence: requests are sent server-side and not stored

## Prerequisites

- Node.js 20+
- pnpm (recommended)

## Quick start

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

Open `http://localhost:3000`.

## IndexNow requirements

You must host the key file on your site:

- Location: `https://<host>/<key>.txt`
- Content: the key only (plain text)

## Notes

- This UI currently targets the Bing endpoint only (`https://www.bing.com/indexnow`).
- If you deploy this publicly, consider adding authentication and rate limiting.

## License

MIT
