🌍 *[English](README.md) ∙ [简体中文](README_zh.md) ∙ [日本語](README_ja.md)*

# submitnow

Bing（Microsoft Copilot・ChatGPT Search 発見基盤）、Yandex、Seznam.cz、Naver、Yep へ **IndexNow** で URL を一括通知できる、無料・オープンソースの多言語 Web ワークベンチ兼ゼロ依存 CLI / MCP サーバーです。

## 主な機能

- **マルチエンドポイント・自動分割送信**：`api.indexnow.org`（既定）、Bing、Yandex、Seznam.cz、Naver、Yep に対応。10,000 件超の URL も自動分割して順次送信
- **公開サイトマップ・インデックス取得**：`sitemap.xml`、`.xml.gz`、ネストされた `<sitemapindex>` を取得し、`lastmod`（24 時間 / 7 日 / 30 日）で更新分のみ抽出
- **6 つのブラウザ完結型ツール**：キー生成、SSRF 対策付きキー検証、URL 正規化、バッチ整理（10,000 件単位分割）、サイトマップ差分比較（追加・更新・削除）、コード生成（`curl` / JS / Python / Go / GitHub Actions / JSON）
- **複数サイトプロファイル・履歴エクスポート**：端末内 `localStorage` のみで複数サイト設定・ホスト別基準スナップショット・CSV/JSON 履歴出力・ワンクリック再読込に対応
- **ゼロ依存 CLI & MCP サーバー**：`cli/submitnow.ts` をターミナルや CI から実行、または `mcp/server.ts` を Claude Code / Cursor / Antigravity へ接続
- **セキュリティ・プライバシー設計**：サーバー側データベース非保存、外部取得の SSRF 対策、HMAC 署名付き配信停止トークン、IP 単位のレート制限
- **3 言語対応**：English / 简体中文 / 日本語

## 前提条件

- Node.js 22+
- pnpm（推奨）

## クイックスタート

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

`http://localhost:3000` を開きます。

## CLI・MCP サーバー

```bash
# CLI の実行例
node cli/submitnow.ts --help
node cli/submitnow.ts check-key --host www.example.com --key "$INDEXNOW_KEY"
node cli/submitnow.ts submit --sitemap https://www.example.com/sitemap.xml --lastmod-days 7 --key "$INDEXNOW_KEY" --dry-run

# stdio MCP サーバー起動（Claude Code / Cursor / Antigravity 向け）
node mcp/server.ts
```

## テスト・検証

```bash
pnpm test
pnpm lint
pnpm build
```

## License

MIT
