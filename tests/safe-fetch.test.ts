import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isBlockedHostname,
  isPrivateOrReservedIp,
  safeDnsLookup,
  validatePublicHttpUrlSyntax,
} from '../lib/safe-fetch.ts';

test('isPrivateOrReservedIp blocks IPv4 private, loopback, link-local, CGNAT, and metadata ranges', () => {
  const blocked = [
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '127.255.255.254',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '198.18.0.1',
    '224.0.0.1',
    '255.255.255.255',
  ];
  for (const ip of blocked) {
    assert.equal(isPrivateOrReservedIp(ip), true, `Expected ${ip} to be blocked`);
  }

  const allowed = ['1.1.1.1', '8.8.8.8', '93.184.216.34', '172.32.0.1', '192.167.1.1'];
  for (const ip of allowed) {
    assert.equal(isPrivateOrReservedIp(ip), false, `Expected ${ip} to be allowed`);
  }
});

test('isPrivateOrReservedIp blocks IPv6 loopback, ULA, link-local, and IPv4-mapped private addresses', () => {
  const blocked = [
    '::',
    '::1',
    'fc00::1',
    'fd12:3456:789a::1',
    'fe80::1',
    'ff02::1',
    '::ffff:127.0.0.1',
    '::ffff:169.254.169.254',
    '::ffff:10.0.0.5',
    '64:ff9b::127.0.0.1',
    '2001:db8::1',
  ];
  for (const ip of blocked) {
    assert.equal(isPrivateOrReservedIp(ip), true, `Expected ${ip} to be blocked`);
  }

  const allowed = ['2606:4700:4700::1111', '2001:4860:4860::8888'];
  for (const ip of allowed) {
    assert.equal(isPrivateOrReservedIp(ip), false, `Expected ${ip} to be allowed`);
  }
});

test('isBlockedHostname and validatePublicHttpUrlSyntax enforce public HTTP(S) constraints', () => {
  assert.equal(isBlockedHostname('localhost'), true);
  assert.equal(isBlockedHostname('foo.localhost'), true);
  assert.equal(isBlockedHostname('metadata.google.internal'), true);
  assert.equal(isBlockedHostname('printer.local'), true);
  assert.equal(isBlockedHostname('intranet'), true);
  assert.equal(isBlockedHostname('example.com'), false);

  assert.equal(
    validatePublicHttpUrlSyntax(new URL('https://example.com/key.txt')),
    true
  );
  assert.equal(
    validatePublicHttpUrlSyntax(new URL('http://example.com:80/key.txt')),
    true
  );
  assert.equal(
    validatePublicHttpUrlSyntax(new URL('https://example.com:8443/key.txt')),
    false
  );
  assert.equal(
    validatePublicHttpUrlSyntax(new URL('https://user:pass@example.com/key.txt')),
    false
  );
  assert.equal(
    validatePublicHttpUrlSyntax(new URL('http://169.254.169.254/latest/meta-data/')),
    false
  );
  assert.equal(
    validatePublicHttpUrlSyntax(new URL('ftp://example.com/key.txt')),
    false
  );
});

test('safeDnsLookup rejects private IP literals and handles both all:true and single-address callbacks', async () => {
  await assert.rejects(
    () =>
      new Promise<void>((resolve, reject) => {
        safeDnsLookup('127.0.0.1', { all: true }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
    (err: unknown) =>
      err instanceof Error &&
      'code' in err &&
      (err as { code: string }).code === 'blocked_url'
  );

  const allResult = await new Promise<unknown>((resolve, reject) => {
    safeDnsLookup('1.1.1.1', { all: true }, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses);
    });
  });
  assert.deepEqual(allResult, [{ address: '1.1.1.1', family: 4 }]);

  const singleResult = await new Promise<{ address: unknown; family: unknown }>(
    (resolve, reject) => {
      safeDnsLookup('1.1.1.1', {}, (err, address, family) => {
        if (err) reject(err);
        else resolve({ address, family });
      });
    }
  );
  assert.deepEqual(singleResult, { address: '1.1.1.1', family: 4 });
});
