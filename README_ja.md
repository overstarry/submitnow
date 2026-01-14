🌍 *[English](README.md) ∙ [简体中文](README_zh.md) ∙ [日本語](README_ja.md)*

# submitnow（Bing のみ）

IndexNow プロトコルを使って Bing に URL をまとめて送信するための、多言語対応 Web UI です。

## 機能

- 1 回あたり最大 10,000 件の URL を送信
- URL リストから host を自動推測（手動入力も可）
- 多言語 UI（English / 中文 / 日本語）
- 永続化なし：入力内容は保存せず、サーバー側でリクエストを送信

## 前提

- Node.js 20+
- pnpm（推奨）

## クイックスタート

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

`http://localhost:3000` を開きます。

## IndexNow の要件

サイト上で key ファイルを公開してください：

- 位置：`https://<host>/<key>.txt`
- 内容：key のみ（プレーンテキスト）

## メモ

- 現在は Bing のエンドポイントのみ対応（`https://www.bing.com/indexnow`）。
- 公開デプロイする場合は、認証とレート制限の追加を推奨します。

## License

MIT
