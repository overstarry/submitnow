#!/usr/bin/env node
import path from 'node:path';
import readline from 'node:readline';
import { pathToFileURL } from 'node:url';
import {
  fetchRemoteSitemapEntries,
  generateSecureKey,
  submitIndexNowBatches,
  verifyRemoteKeyFile,
} from '../lib/indexnow-runtime.ts';

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = {
  name: 'submitnow',
  version: '2.2.0',
};

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

export const MCP_TOOLS = [
  {
    name: 'indexnow_generate_key',
    description:
      'Generate a cryptographically random 48-character hexadecimal IndexNow ownership key locally.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'indexnow_check_key',
    description:
      'Verify a public IndexNow key file for 404s, soft-404 HTML, UTF-8 BOMs, off-host redirects, and exact body match (SSRF-guarded).',
    inputSchema: {
      type: 'object',
      properties: {
        host: {
          type: 'string',
          description: 'Target hostname, e.g. www.example.com',
        },
        key: {
          type: 'string',
          description: 'IndexNow key string (8–128 chars)',
        },
        keyLocation: {
          type: 'string',
          description: 'Optional custom key file URL on the same host',
        },
      },
      required: ['host', 'key'],
      additionalProperties: false,
    },
  },
  {
    name: 'indexnow_fetch_sitemap',
    description:
      'Fetch a public XML sitemap, .xml.gz file, or nested sitemapindex with optional lastmod day filtering (SSRF-guarded).',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Public http(s) URL to sitemap.xml or sitemap index',
        },
        maxAgeDays: {
          type: 'number',
          description: 'Optional lastmod lookback window in days (e.g. 1, 7, 30)',
        },
      },
      required: ['url'],
      additionalProperties: false,
    },
  },
  {
    name: 'indexnow_submit_urls',
    description:
      'Validate host, protocol, and subdirectory keyLocation scope, then submit same-host URLs (auto-chunked in 10,000-URL batches) to api.indexnow.org or a chosen search engine endpoint.',
    inputSchema: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of absolute http(s) URLs belonging to one host',
        },
        key: {
          type: 'string',
          description: 'IndexNow ownership key hosted on the target domain',
        },
        host: {
          type: 'string',
          description: 'Optional hostname override (inferred from urls if omitted)',
        },
        keyLocation: {
          type: 'string',
          description: 'Optional custom key file URL on the same host',
        },
        endpointId: {
          type: 'string',
          enum: ['indexnow', 'bing', 'yandex', 'seznam', 'naver', 'yep'],
          description: 'IndexNow endpoint (defaults to api.indexnow.org)',
        },
        dryRun: {
          type: 'boolean',
          description: 'Validate and preview batches without sending HTTP requests',
        },
      },
      required: ['urls', 'key'],
      additionalProperties: false,
    },
  },
] as const;

async function callTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }> {
  if (name === 'indexnow_generate_key') {
    const key = generateSecureKey();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            { key, fileName: `${key}.txt`, content: key },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === 'indexnow_check_key') {
    const result = await verifyRemoteKeyFile({
      host: String(args.host ?? ''),
      key: String(args.key ?? ''),
      keyLocation:
        typeof args.keyLocation === 'string' ? args.keyLocation : undefined,
    });
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === 'indexnow_fetch_sitemap') {
    const result = await fetchRemoteSitemapEntries({
      url: String(args.url ?? ''),
      maxAgeDays:
        typeof args.maxAgeDays === 'number' ? args.maxAgeDays : undefined,
    });
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === 'indexnow_submit_urls') {
    const urls = Array.isArray(args.urls)
      ? args.urls.map((u) => String(u))
      : [];
    const result = await submitIndexNowBatches({
      urls,
      key: String(args.key ?? ''),
      host: typeof args.host === 'string' ? args.host : undefined,
      keyLocation:
        typeof args.keyLocation === 'string' ? args.keyLocation : undefined,
      endpointId:
        typeof args.endpointId === 'string' ? args.endpointId : undefined,
      dryRun: Boolean(args.dryRun),
    });
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ ok: false, error: `Unknown tool: ${name}` }),
      },
    ],
    isError: true,
  };
}

/**
 * Handles one JSON-RPC 2.0 request. Returns null for notifications (requests
 * without an `id`), which must not produce a response on stdio.
 */
export async function handleJsonRpcMessage(
  message: JsonRpcRequest
): Promise<JsonRpcResponse | null> {
  const hasId = message.id !== undefined;
  const id: JsonRpcId = message.id ?? null;

  if (message.method === 'notifications/initialized') {
    return null;
  }

  if (message.method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      },
    };
  }

  if (message.method === 'ping') {
    return { jsonrpc: '2.0', id, result: {} };
  }

  if (message.method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: { tools: MCP_TOOLS },
    };
  }

  if (message.method === 'tools/call') {
    const params = message.params ?? {};
    const toolName = typeof params.name === 'string' ? params.name : '';
    const toolArgs =
      params.arguments && typeof params.arguments === 'object'
        ? (params.arguments as Record<string, unknown>)
        : {};

    const result = await callTool(toolName, toolArgs);
    return { jsonrpc: '2.0', id, result };
  }

  if (!hasId) {
    return null;
  }

  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `Method not found: ${message.method}`,
    },
  };
}

function startStdioServer(): void {
  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let parsed: JsonRpcRequest;
    try {
      parsed = JSON.parse(trimmed) as JsonRpcRequest;
    } catch {
      const parseError: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' },
      };
      process.stdout.write(`${JSON.stringify(parseError)}\n`);
      return;
    }

    void handleJsonRpcMessage(parsed)
      .then((response) => {
        if (response) {
          process.stdout.write(`${JSON.stringify(response)}\n`);
        }
      })
      .catch((error) => {
        if (parsed.id !== undefined) {
          const internalError: JsonRpcResponse = {
            jsonrpc: '2.0',
            id: parsed.id,
            error: {
              code: -32603,
              message:
                error instanceof Error ? error.message : 'Internal server error',
            },
          };
          process.stdout.write(`${JSON.stringify(internalError)}\n`);
        }
      });
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  startStdioServer();
}
