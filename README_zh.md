🌍 *[English](README.md) ∙ [简体中文](README_zh.md) ∙ [日本語](README_ja.md)*

# submitnow（仅 Bing）

一个支持多语言的 Web 界面，用于通过 IndexNow 协议向 Bing 批量提交 URL。

## 功能

- 单次最多提交 10,000 条 URL
- 可从 URL 列表自动推断 host（也可手动填写）
- 多语言界面（English / 中文 / 日本語）
- 不做持久化：请求在服务端转发，不存储输入内容

## 依赖

- Node.js 20+
- pnpm（推荐）

## 快速开始

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

访问 `http://localhost:3000`。

## IndexNow 前置条件

你需要在站点上托管 key 文件：

- 位置：`https://<host>/<key>.txt`
- 内容：仅包含 key（纯文本）

## 说明

- 当前仅对接 Bing 端点（`https://www.bing.com/indexnow`）。
- 如果公开部署，建议增加鉴权与限流。

## License

MIT
