import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCliArgs } from '../cli/submitnow.ts';
import {
  generateSecureKey,
  submitIndexNowBatches,
  verifyRemoteKeyFile,
} from '../lib/indexnow-runtime.ts';
import { handleJsonRpcMessage, MCP_TOOLS } from '../mcp/server.ts';

test('parseCliArgs parses commands, flags, key=value pairs, and URL lists', () => {
  const parsed = parseCliArgs([
    'submit',
    '--key=abcdef123456',
    '--endpoint',
    'bing',
    '--dry-run',
    '--urls',
    'https://example.com/a',
    'https://example.com/b',
  ]);

  assert.equal(parsed.command, 'submit');
  assert.equal(parsed.flags.key, 'abcdef123456');
  assert.equal(parsed.flags.endpoint, 'bing');
  assert.equal(parsed.flags['dry-run'], true);
  assert.deepEqual(parsed.urls, [
    'https://example.com/a',
    'https://example.com/b',
  ]);
});

test('runtime submitIndexNowBatches supports dryRun auto-batching and enforces subdirectory scope', async () => {
  const key = generateSecureKey();
  assert.match(key, /^[0-9a-f]{48}$/);

  const urls = Array.from(
    { length: 10_005 },
    (_, i) => `https://example.com/blog/post-${i}`
  );
  const dry = await submitIndexNowBatches({
    urls,
    key,
    keyLocation: `https://example.com/blog/${key}.txt`,
    endpointId: 'indexnow',
    dryRun: true,
  });

  assert.equal(dry.ok, true);
  if (dry.ok) {
    assert.equal(dry.dryRun, true);
    assert.equal(dry.submittedCount, 10_005);
    assert.equal(dry.batches.length, 2);
    assert.equal(dry.batches[0].count, 10_000);
    assert.equal(dry.batches[1].count, 5);
  }

  const outOfScope = await submitIndexNowBatches({
    urls: ['https://example.com/pricing'],
    key,
    keyLocation: `https://example.com/blog/${key}.txt`,
    dryRun: true,
  });
  assert.equal(outOfScope.ok, false);
  if (!outOfScope.ok) {
    assert.equal(outOfScope.errorCode, 'key_location_scope_mismatch');
  }
});

test('runtime verifyRemoteKeyFile blocks private and metadata SSRF targets', async () => {
  const blocked = await verifyRemoteKeyFile({
    host: '169.254.169.254',
    key: 'abcdef1234567890',
  });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) {
    assert.equal(blocked.errorCode, 'blocked_url');
  }
});

test('MCP server handles initialize, notifications, tools/list, and tools/call cleanly', async () => {
  const initRes = await handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {},
  });
  assert.ok(initRes && 'result' in initRes);
  const initResult = initRes.result as {
    protocolVersion: string;
    serverInfo: { name: string };
  };
  assert.equal(initResult.serverInfo.name, 'submitnow');

  // Notifications must not emit a response
  const notifRes = await handleJsonRpcMessage({
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  });
  assert.equal(notifRes, null);

  const listRes = await handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
  });
  assert.ok(listRes && listRes.result);
  assert.equal(MCP_TOOLS.length, 4);

  // Generate key via MCP tool call
  const genRes = await handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'indexnow_generate_key', arguments: {} },
  });
  assert.ok(genRes && genRes.result);
  const genPayload = JSON.parse(
    (genRes.result as { content: { text: string }[] }).content[0].text
  ) as { key: string; fileName: string };
  assert.match(genPayload.key, /^[0-9a-f]{48}$/);
  assert.equal(genPayload.fileName, `${genPayload.key}.txt`);

  // Dry-run submit via MCP tool call
  const submitRes = await handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'indexnow_submit_urls',
      arguments: {
        urls: ['https://example.com/a', 'https://example.com/b'],
        key: genPayload.key,
        endpointId: 'bing',
        dryRun: true,
      },
    },
  });
  assert.ok(submitRes && submitRes.result);
  const submitToolResult = submitRes.result as {
    isError?: boolean;
    content: { text: string }[];
  };
  assert.equal(submitToolResult.isError, false);
  const parsedSubmit = JSON.parse(submitToolResult.content[0].text) as {
    ok: boolean;
    endpointUrl: string;
    submittedCount: number;
  };
  assert.equal(parsedSubmit.ok, true);
  assert.equal(parsedSubmit.endpointUrl, 'https://www.bing.com/indexnow');
  assert.equal(parsedSubmit.submittedCount, 2);

  // SSRF check via MCP tool call must fail safely
  const ssrfRes = await handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'indexnow_fetch_sitemap',
      arguments: { url: 'http://127.0.0.1/sitemap.xml' },
    },
  });
  assert.ok(ssrfRes && ssrfRes.result);
  assert.equal((ssrfRes.result as { isError?: boolean }).isError, true);

  // Unknown method returns JSON-RPC -32601
  const unknownRes = await handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 6,
    method: 'nonexistent/method',
  });
  assert.equal(unknownRes?.error?.code, -32601);
});
