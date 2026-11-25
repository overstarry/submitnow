import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildIndexNowPayload,
  generateIndexNowCode,
} from '../lib/indexnow-codegen.ts';
import {
  getKeyLocationDirectoryPrefix,
  resolveIndexNowEndpoint,
  validateKeyLocationScope,
} from '../lib/indexnow-endpoints.ts';
import { serializeSubmissionHistoryCsv } from '../lib/submission-history.ts';
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from '../lib/unsubscribe-token.ts';

test('validateKeyLocationScope enforces host, protocol, and subdirectory boundaries', () => {
  const rootKey = new URL('https://example.com/my-key-1234.txt');
  assert.equal(getKeyLocationDirectoryPrefix(rootKey), '/');
  assert.equal(
    validateKeyLocationScope(rootKey, 'example.com', [
      new URL('https://example.com/a'),
      new URL('https://example.com/blog/post'),
    ]).valid,
    true
  );

  // Subdirectory key allows URLs under /blog/
  const subKey = new URL('https://example.com/blog/my-key-1234.txt');
  assert.equal(getKeyLocationDirectoryPrefix(subKey), '/blog/');
  assert.equal(
    validateKeyLocationScope(subKey, 'example.com', [
      new URL('https://example.com/blog/post-1'),
    ]).valid,
    true
  );

  // Subdirectory key rejects URLs outside /blog/
  const outside = validateKeyLocationScope(subKey, 'example.com', [
    new URL('https://example.com/docs/intro'),
  ]);
  assert.equal(outside.valid, false);
  if (!outside.valid) {
    assert.equal(outside.reason, 'subdirectory_mismatch');
    assert.equal(outside.directoryPrefix, '/blog/');
  }

  // Protocol mismatch rejected
  const protoMismatch = validateKeyLocationScope(rootKey, 'example.com', [
    new URL('http://example.com/page'),
  ]);
  assert.equal(protoMismatch.valid, false);
  if (!protoMismatch.valid) {
    assert.equal(protoMismatch.reason, 'protocol_mismatch');
  }
});

test('resolveIndexNowEndpoint defaults to api.indexnow.org and resolves known engines', () => {
  assert.equal(resolveIndexNowEndpoint().url, 'https://api.indexnow.org/indexnow');
  assert.equal(resolveIndexNowEndpoint('unknown').id, 'indexnow');
  assert.equal(resolveIndexNowEndpoint('bing').url, 'https://www.bing.com/indexnow');
  assert.equal(resolveIndexNowEndpoint('yandex').url, 'https://yandex.com/indexnow');
});

test('generateIndexNowCode produces snippets for all supported formats', () => {
  const payload = buildIndexNowPayload({
    host: 'example.com',
    key: 'abcdef123456',
    urlList: ['https://example.com/page-1'],
  });

  assert.ok(
    generateIndexNowCode(payload, 'curl', 'https://www.bing.com/indexnow').includes(
      'https://www.bing.com/indexnow'
    )
  );
  assert.ok(generateIndexNowCode(payload, 'python').includes('urllib.request'));
  assert.ok(generateIndexNowCode(payload, 'go').includes('client.Post'));
  const gha = generateIndexNowCode(payload, 'github-actions');
  assert.ok(gha.includes('${{ secrets.INDEXNOW_KEY }}'));
  assert.ok(!gha.includes('abcdef123456'));
});

test('createUnsubscribeToken and verifyUnsubscribeToken reject tampered or unsigned tokens', () => {
  const secret = 'test-signing-secret-123';
  const token = createUnsubscribeToken('user@example.com', secret);

  assert.equal(verifyUnsubscribeToken(token, secret), 'user@example.com');
  assert.equal(verifyUnsubscribeToken(token, 'wrong-secret'), null);
  assert.equal(verifyUnsubscribeToken(`${token}x`, secret), null);

  // Legacy unsigned bare base64 token must be rejected
  const unsigned = Buffer.from('user@example.com').toString('base64');
  assert.equal(verifyUnsubscribeToken(unsigned, secret), null);
});

test('serializeSubmissionHistoryCsv neutralizes formula injection and escapes quotes', () => {
  const csv = serializeSubmissionHistoryCsv([
    {
      id: '1',
      createdAt: '2026-11-25T10:00:00Z',
      host: '=cmd|calc',
      urlCount: 42,
      outcome: 'success',
      httpStatus: 200,
      endpointId: 'indexnow',
      batchCount: 2,
    },
  ]);

  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[1].includes("'=cmd|calc"));
  assert.ok(lines[1].includes(',indexnow,42,2,success,200,'));
});
