# submitnow-mcp

Zero-dependency **Model Context Protocol (MCP)** server and CLI from [submitnow](https://www.submitnow.dev) for submitting URLs via **IndexNow** to **Bing** (powering **Microsoft Copilot** and **ChatGPT Search**), **Yandex**, **Seznam.cz**, **Naver**, and **Yep**.

- **Zero runtime dependencies** (pure Node.js built-ins, Node 20+)
- **Zero account & zero server storage**
- **SSRF-guarded** public key verification and sitemap / nested `<sitemapindex>` / `.xml.gz` fetching
- **Automatic batching** for lists over 10,000 same-host URLs + subdirectory `keyLocation` scope validation

## Option 1: Hosted Streamable HTTP MCP (No Install)

Connect directly to the hosted stateless endpoint at `https://www.submitnow.dev/mcp`:

```bash
claude mcp add --transport http submitnow https://www.submitnow.dev/mcp
```

## Option 2: Local stdio MCP via `npx` (No Hosted Rate Limits)

Add to Claude Code, Cursor, Windsurf, or Antigravity:

```json
{
  "mcpServers": {
    "submitnow": {
      "command": "npx",
      "args": ["-y", "submitnow-mcp"]
    }
  }
}
```

## Exposed MCP Tools

| Tool | Description |
| :--- | :--- |
| `indexnow_generate_key` | Generate a cryptographically random 48-character hex IndexNow key locally. |
| `indexnow_check_key` | Verify a public `<key>.txt` file for 404s, soft-404 HTML, UTF-8 BOMs, off-host redirects, and exact body match. |
| `indexnow_fetch_sitemap` | Fetch a public `sitemap.xml`, `.xml.gz`, or nested `<sitemapindex>` with optional `lastmod` day filtering (`maxAgeDays`). |
| `indexnow_submit_urls` | Validate host, protocol, and subdirectory `keyLocation` scope, then submit same-host URLs (auto-chunked in 10,000-URL batches) with optional `dryRun`. |

## CLI Usage

```bash
npx -y -p submitnow-mcp submitnow generate-key --write
npx -y -p submitnow-mcp submitnow check-key --host www.example.com --key "$INDEXNOW_KEY"
npx -y -p submitnow-mcp submitnow submit --sitemap https://www.example.com/sitemap.xml --lastmod-days 7 --key "$INDEXNOW_KEY" --dry-run
```

## Links

- Web Workbench: https://www.submitnow.dev
- Documentation: https://www.submitnow.dev/docs/integrations/cli-and-mcp
- Source Code (MIT): https://github.com/overstarry/submitnow
