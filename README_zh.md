🌍 *[English](README.md) ∙ [简体中文](README_zh.md) ∙ [日本語](README_ja.md)*

# submitnow

免费、开源、支持多语言的 **IndexNow** 批量提交工作台、浏览器端 SEO 工具箱以及零依赖 CLI / MCP Server，一键触达 Bing（支撑 Microsoft Copilot 与 ChatGPT Search 发现）、Yandex、Seznam.cz、Naver 和 Yep。

## 核心功能

- **多端点与超万条自动分批提交**：支持 `api.indexnow.org`（默认）、Bing、Yandex、Seznam.cz、Naver、Yep，超过 10,000 条自动按批顺序提交
- **在线 Sitemap 与嵌套 Index 拉取**：直接抓取公网 `sitemap.xml`、`.xml.gz` 和嵌套 `<sitemapindex>`，支持按 `lastmod`（24 小时 / 7 天 / 30 天）过滤增量
- **六款浏览器端配套工具**：密钥生成器、带 SSRF 防护的密钥校验器、URL 规范化、批次整理器（按主机与 10,000 条切片）、Sitemap 对比（新增 / 变更 / 已删除）与代码生成器（`curl` / JS / Python / Go / GitHub Actions / JSON）
- **多站点本地 Profile 与历史导出**：纯本地可选保存多站点配置、分域名 Sitemap 基线、历史记录一键重载与 CSV/JSON 导出
- **内置零依赖 CLI 与 MCP Server**：终端直接运行 `cli/submitnow.ts`，或将 `mcp/server.ts` 接入 Claude Code / Cursor / Antigravity
- **安全与隐私加固**：服务端零数据库持久化、出站请求 SSRF 防护、退订链接 HMAC 签名、按 IP 维度的 Upstash / 内存限流
- **完整三语界面与文档**：English / 简体中文 / 日本語

## 环境依赖

- Node.js 22+
- pnpm（推荐）

## 快速开始

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

访问 `http://localhost:3000`。

## CLI 与 MCP Server

```bash
# CLI 示例
node cli/submitnow.ts --help
node cli/submitnow.ts check-key --host www.example.com --key "$INDEXNOW_KEY"
node cli/submitnow.ts submit --sitemap https://www.example.com/sitemap.xml --lastmod-days 7 --key "$INDEXNOW_KEY" --dry-run

# 启动 stdio MCP Server（接入 Claude Code / Cursor / Antigravity）
node mcp/server.ts
```

## 测试与构建

```bash
pnpm test
pnpm lint
pnpm build
```

## License

MIT
