import {
  DEFAULT_PROTOCOL_VERSION,
  handleJsonRpcMessage,
  SERVER_INFO,
  SUPPORTED_PROTOCOL_VERSIONS,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from '../mcp/server.ts';

export type McpRateLimitScope =
  | 'indexnow_submit'
  | 'key_check'
  | 'sitemap_fetch';

export type McpRateLimitChecker = (
  scope: McpRateLimitScope
) => Promise<{ allowed: boolean; retryAfterSeconds?: number }>;

const MAX_MCP_BODY_BYTES = 2.5 * 1024 * 1024;
const MAX_BATCH_REQUESTS = 20;

export const MCP_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, MCP-Protocol-Version',
};

function jsonResponse(
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'MCP-Protocol-Version': DEFAULT_PROTOCOL_VERSION,
      ...MCP_CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function isJsonRpcObject(value: unknown): value is JsonRpcRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.jsonrpc === '2.0' && typeof candidate.method === 'string';
}

function resolveRateLimitScope(
  message: JsonRpcRequest
): McpRateLimitScope | null {
  if (message.method !== 'tools/call') return null;
  const params = message.params;
  if (!params || typeof params !== 'object') return null;
  const toolName = typeof params.name === 'string' ? params.name : '';
  const args =
    params.arguments && typeof params.arguments === 'object'
      ? (params.arguments as Record<string, unknown>)
      : {};

  if (toolName === 'indexnow_check_key') return 'key_check';
  if (toolName === 'indexnow_fetch_sitemap') return 'sitemap_fetch';
  if (toolName === 'indexnow_submit_urls' && !args.dryRun) {
    return 'indexnow_submit';
  }
  return null;
}

export function handleMcpOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...MCP_CORS_HEADERS,
      'Access-Control-Max-Age': '86400',
    },
  });
}

export function handleMcpGet(): Response {
  // Per MCP Streamable HTTP spec, stateless servers without an unsolicited SSE
  // stream MUST answer GET with 405 Method Not Allowed.
  return jsonResponse(
    {
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
      transport: 'streamable-http',
      protocolVersions: SUPPORTED_PROTOCOL_VERSIONS,
      docs: 'https://www.submitnow.dev/docs/integrations/cli-and-mcp',
      message: 'Send MCP JSON-RPC 2.0 requests via HTTP POST to this endpoint.',
    },
    405,
    { Allow: 'POST, OPTIONS, DELETE' }
  );
}

export function handleMcpDelete(): Response {
  return new Response(null, {
    status: 204,
    headers: MCP_CORS_HEADERS,
  });
}

export async function handleMcpPost(
  request: Request,
  checkRateLimit?: McpRateLimitChecker
): Promise<Response> {
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_MCP_BODY_BYTES) {
    return jsonResponse(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'Request body too large' },
      },
      413
    );
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return jsonResponse(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Failed to read request body' },
      },
      400
    );
  }

  if (Buffer.byteLength(rawText, 'utf8') > MAX_MCP_BODY_BYTES) {
    return jsonResponse(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'Request body too large' },
      },
      413
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return jsonResponse(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' },
      },
      400
    );
  }

  const isBatch = Array.isArray(parsed);
  const messages: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

  if (messages.length === 0 || messages.length > MAX_BATCH_REQUESTS) {
    return jsonResponse(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'Invalid JSON-RPC batch size' },
      },
      400
    );
  }

  const responses: JsonRpcResponse[] = [];
  let negotiatedVersion = DEFAULT_PROTOCOL_VERSION;

  for (const item of messages) {
    if (!isJsonRpcObject(item)) {
      responses.push({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'Invalid JSON-RPC 2.0 request' },
      });
      continue;
    }

    const scope = resolveRateLimitScope(item);
    if (scope && checkRateLimit) {
      const limitResult = await checkRateLimit(scope);
      if (!limitResult.allowed) {
        const retryAfter = limitResult.retryAfterSeconds ?? 60;
        const rateLimitError: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: item.id ?? null,
          error: {
            code: -32000,
            message: `Rate limit exceeded for ${scope}. Retry in ${retryAfter} seconds, or run submitnow locally via npx/CLI without hosted IP limits.`,
            data: { retryAfterSeconds: retryAfter, scope },
          },
        };
        if (!isBatch) {
          return jsonResponse(rateLimitError, 429, {
            'Retry-After': String(retryAfter),
          });
        }
        responses.push(rateLimitError);
        continue;
      }
    }

    const reply = await handleJsonRpcMessage(item);
    if (reply) {
      if (
        item.method === 'initialize' &&
        reply.result &&
        typeof reply.result === 'object' &&
        typeof (reply.result as { protocolVersion?: unknown }).protocolVersion ===
          'string'
      ) {
        negotiatedVersion = (reply.result as { protocolVersion: string })
          .protocolVersion;
      }
      responses.push(reply);
    }
  }

  if (responses.length === 0) {
    return new Response(null, {
      status: 202,
      headers: {
        'MCP-Protocol-Version': negotiatedVersion,
        ...MCP_CORS_HEADERS,
      },
    });
  }

  return jsonResponse(isBatch ? responses : responses[0], 200, {
    'MCP-Protocol-Version': negotiatedVersion,
  });
}
