import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

export type SafeFetchErrorCode =
  | 'blocked_url'
  | 'too_many_redirects'
  | 'timeout'
  | 'response_too_large'
  | 'fetch_failed';

export class SafeFetchError extends Error {
  readonly code: SafeFetchErrorCode;

  constructor(code: SafeFetchErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'SafeFetchError';
    this.code = code;
  }
}

export type SafeFetchOptions = {
  timeoutMs: number;
  maxBytes: number;
  maxRedirects?: number;
  accept?: string;
  userAgent?: string;
  /**
   * When true, stops reading at maxBytes and returns `truncated: true` instead
   * of throwing `response_too_large`. Useful for key checks that inspect headers
   * and report oversized bodies as a diagnostic issue.
   */
  allowTruncate?: boolean;
};

export type SafeFetchResult = {
  status: number;
  ok: boolean;
  headers: Headers;
  finalUrl: string;
  bytes: Uint8Array;
  truncated: boolean;
};

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata.goog',
  'metadata',
  'instance-data',
]);

const BLOCKED_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.home.arpa',
];

const ALLOWED_PORTS = new Set(['', '80', '443']);

function parseIpv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet < 0 || octet > 255) return null;
    value = value * 256 + octet;
  }
  return value >>> 0;
}

function ipv4InCidr(ipInt: number, baseIp: string, prefixLen: number): boolean {
  const baseInt = parseIpv4ToInt(baseIp);
  if (baseInt === null) return false;
  const mask = prefixLen === 0 ? 0 : (~0 << (32 - prefixLen)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

const RESERVED_IPV4_CIDRS: [string, number][] = [
  ['0.0.0.0', 8],          // "This" network (RFC 1122)
  ['10.0.0.0', 8],         // Private-Use (RFC 1918)
  ['100.64.0.0', 10],      // Shared Address Space / CGNAT (RFC 6598)
  ['127.0.0.0', 8],        // Loopback (RFC 1122)
  ['169.254.0.0', 16],     // Link-Local & Cloud Metadata (RFC 3927)
  ['172.16.0.0', 12],      // Private-Use (RFC 1918)
  ['192.0.0.0', 24],       // IETF Protocol Assignments
  ['192.0.2.0', 24],       // TEST-NET-1
  ['192.88.99.0', 24],     // 6to4 Relay Anycast
  ['192.168.0.0', 16],     // Private-Use (RFC 1918)
  ['198.18.0.0', 15],      // Benchmarking
  ['198.51.100.0', 24],    // TEST-NET-2
  ['203.0.113.0', 24],     // TEST-NET-3
  ['224.0.0.0', 4],        // Multicast
  ['240.0.0.0', 4],        // Reserved / Broadcast
];

function expandIpv6(ip: string): number[] | null {
  const cleaned = ip.toLowerCase().split('%')[0];

  // Handle IPv4-embedded IPv6 such as ::ffff:127.0.0.1
  const lastColon = cleaned.lastIndexOf(':');
  let normalized = cleaned;
  if (lastColon !== -1 && cleaned.slice(lastColon + 1).includes('.')) {
    const ipv4 = parseIpv4ToInt(cleaned.slice(lastColon + 1));
    if (ipv4 === null) return null;
    const hi = ((ipv4 >>> 16) & 0xffff).toString(16);
    const lo = (ipv4 & 0xffff).toString(16);
    normalized = `${cleaned.slice(0, lastColon)}:${hi}:${lo}`;
  }

  const halves = normalized.split('::');
  if (halves.length > 2) return null;

  const parseGroups = (segment: string): number[] | null => {
    if (!segment) return [];
    const groups = segment.split(':');
    const values: number[] = [];
    for (const group of groups) {
      if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
      values.push(parseInt(group, 16));
    }
    return values;
  };

  const left = parseGroups(halves[0]);
  const right = halves.length === 2 ? parseGroups(halves[1]) : [];
  if (!left || !right) return null;

  if (halves.length === 1) {
    return left.length === 8 ? left : null;
  }

  const missing = 8 - (left.length + right.length);
  if (missing < 1) return null;
  return [...left, ...new Array<number>(missing).fill(0), ...right];
}

export function isPrivateOrReservedIp(rawIp: string): boolean {
  const ip = rawIp.trim().replace(/^\[|\]$/g, '');
  const version = net.isIP(ip);

  if (version === 4) {
    const ipInt = parseIpv4ToInt(ip);
    if (ipInt === null) return true;
    return RESERVED_IPV4_CIDRS.some(([base, prefix]) =>
      ipv4InCidr(ipInt, base, prefix)
    );
  }

  if (version === 6) {
    const groups = expandIpv6(ip);
    if (!groups) return true;

    const isAllZero = groups.every((g) => g === 0);
    if (isAllZero) return true; // ::

    const isLoopback =
      groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1;
    if (isLoopback) return true; // ::1

    // IPv4-mapped (::ffff:0:0/96) or NAT64 well-known prefix (64:ff9b::/96)
    const isIpv4Mapped =
      groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff;
    const isNat64 =
      groups[0] === 0x0064 &&
      groups[1] === 0xff9b &&
      groups.slice(2, 6).every((g) => g === 0);
    if (isIpv4Mapped || isNat64) {
      const ipv4Int = ((groups[6] << 16) | groups[7]) >>> 0;
      return RESERVED_IPV4_CIDRS.some(([base, prefix]) =>
        ipv4InCidr(ipv4Int, base, prefix)
      );
    }

    // Unique local fc00::/7 (fc00..fdff)
    if ((groups[0] & 0xfe00) === 0xfc00) return true;
    // Link-local fe80::/10 (fe80..febf)
    if ((groups[0] & 0xffc0) === 0xfe80) return true;
    // Deprecated site-local fec0::/10
    if ((groups[0] & 0xffc0) === 0xfec0) return true;
    // Multicast ff00::/8
    if ((groups[0] & 0xff00) === 0xff00) return true;
    // Documentation 2001:db8::/32
    if (groups[0] === 0x2001 && groups[1] === 0x0db8) return true;
    // Discard-only 100::/64
    if (groups[0] === 0x0100 && groups.slice(1, 4).every((g) => g === 0)) {
      return true;
    }

    return false;
  }

  return true;
}

export function isBlockedHostname(rawHostname: string): boolean {
  const hostname = rawHostname.trim().toLowerCase().replace(/\.+$/, '');
  if (!hostname) return true;

  if (BLOCKED_HOSTNAMES.has(hostname)) return true;
  if (BLOCKED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return true;
  }

  // Strip IPv6 brackets when testing raw IP literals
  const unbracketed = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(unbracketed) !== 0) {
    return isPrivateOrReservedIp(unbracketed);
  }

  // Single-label hostnames (no dot) cannot be public internet domains
  if (!hostname.includes('.')) return true;

  return false;
}

export function validatePublicHttpUrlSyntax(url: URL): boolean {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;
  if (!ALLOWED_PORTS.has(url.port)) return false;
  if (isBlockedHostname(url.hostname)) return false;
  return true;
}

/**
 * Custom DNS lookup passed straight into Node's http/https socket creation.
 * Resolving and validating inside the single connect-time lookup eliminates
 * DNS rebinding TOCTOU between a pre-check and the actual TCP connection while
 * keeping TLS SNI and certificate verification bound to the original hostname.
 */
export function safeDnsLookup(
  hostname: string,
  options: dns.LookupOptions | ((err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void),
  maybeCallback?: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void
): void {
  const opts: dns.LookupOptions =
    typeof options === 'function' ? {} : options ?? {};
  const callback = typeof options === 'function' ? options : maybeCallback!;

  const unbracketed = hostname.replace(/^\[|\]$/g, '');
  const ipVersion = net.isIP(unbracketed);
  if (ipVersion !== 0) {
    if (isPrivateOrReservedIp(unbracketed)) {
      callback(
        new SafeFetchError(
          'blocked_url',
          'Target IP address is private or reserved.'
        ) as NodeJS.ErrnoException,
        ''
      );
      return;
    }
    if (opts.all) {
      callback(null, [{ address: unbracketed, family: ipVersion }]);
    } else {
      callback(null, unbracketed, ipVersion);
    }
    return;
  }

  dns.lookup(
    unbracketed,
    { family: opts.family ?? 0, hints: opts.hints, all: true, verbatim: true },
    (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        callback(
          new SafeFetchError(
            'fetch_failed',
            'DNS lookup failed for target host.'
          ) as NodeJS.ErrnoException,
          ''
        );
        return;
      }

      for (const record of addresses) {
        if (isPrivateOrReservedIp(record.address)) {
          callback(
            new SafeFetchError(
              'blocked_url',
              'Target host resolves to a private or reserved IP address.'
            ) as NodeJS.ErrnoException,
            ''
          );
          return;
        }
      }

      if (opts.all) {
        callback(null, addresses);
      } else {
        callback(null, addresses[0].address, addresses[0].family);
      }
    }
  );
}

function toWebHeaders(rawHeaders: http.IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

type HopResult =
  | { kind: 'redirect'; location: string }
  | {
      kind: 'response';
      status: number;
      headers: Headers;
      bytes: Uint8Array;
      truncated: boolean;
    };

function fetchSingleHop(
  url: URL,
  options: SafeFetchOptions,
  signal: AbortSignal
): Promise<HopResult> {
  return new Promise<HopResult>((resolve, reject) => {
    if (!validatePublicHttpUrlSyntax(url)) {
      reject(
        new SafeFetchError(
          'blocked_url',
          'Target URL is not a permitted public HTTP(S) address.'
        )
      );
      return;
    }

    const transport = url.protocol === 'https:' ? https : http;
    let settled = false;

    const finishReject = (err: SafeFetchError) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    const finishResolve = (value: HopResult) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const req = transport.request(
      url,
      {
        method: 'GET',
        signal,
        lookup: safeDnsLookup as unknown as http.RequestOptions['lookup'],
        headers: {
          Accept: options.accept ?? '*/*',
          'Accept-Encoding': 'identity',
          'User-Agent':
            options.userAgent ?? 'submitnow-bot/1.0 (+https://submitnow.dev)',
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const headers = toWebHeaders(res.headers);
        const location = headers.get('location');

        if (status >= 300 && status < 400 && location) {
          res.resume();
          finishResolve({ kind: 'redirect', location });
          return;
        }

        const chunks: Buffer[] = [];
        let total = 0;
        let truncated = false;

        res.on('data', (chunk: Buffer) => {
          if (settled) return;

          if (total + chunk.byteLength > options.maxBytes) {
            if (!options.allowTruncate) {
              res.destroy();
              finishReject(new SafeFetchError('response_too_large'));
              return;
            }

            const remaining = options.maxBytes - total;
            if (remaining > 0) {
              chunks.push(chunk.subarray(0, remaining));
              total += remaining;
            }
            truncated = true;
            res.destroy();
            finishResolve({
              kind: 'response',
              status,
              headers,
              bytes: new Uint8Array(Buffer.concat(chunks, total)),
              truncated: true,
            });
            return;
          }

          chunks.push(chunk);
          total += chunk.byteLength;
        });

        res.on('end', () => {
          finishResolve({
            kind: 'response',
            status,
            headers,
            bytes: new Uint8Array(Buffer.concat(chunks, total)),
            truncated,
          });
        });

        res.on('error', (err) => {
          if (signal.aborted) {
            finishReject(new SafeFetchError('timeout'));
            return;
          }
          if (err instanceof SafeFetchError) {
            finishReject(err);
            return;
          }
          finishReject(new SafeFetchError('fetch_failed'));
        });
      }
    );

    req.on('error', (err) => {
      if (signal.aborted) {
        finishReject(new SafeFetchError('timeout'));
        return;
      }
      if (err instanceof SafeFetchError) {
        finishReject(err);
        return;
      }
      finishReject(new SafeFetchError('fetch_failed'));
    });

    req.end();
  });
}

/**
 * Fetches a public HTTP(S) resource with connect-time DNS validation (immune
 * to DNS rebinding TOCTOU), per-hop redirect validation, bounded streaming
 * response reading, and an overall timeout.
 */
export async function safeFetch(
  initialUrl: URL,
  options: SafeFetchOptions
): Promise<SafeFetchResult> {
  const maxRedirects = options.maxRedirects ?? 5;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  let currentUrl = new URL(initialUrl.toString());

  try {
    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      const outcome = await fetchSingleHop(currentUrl, options, controller.signal);

      if (outcome.kind === 'redirect') {
        if (hop === maxRedirects) {
          throw new SafeFetchError('too_many_redirects');
        }
        try {
          currentUrl = new URL(outcome.location, currentUrl);
        } catch {
          throw new SafeFetchError('blocked_url');
        }
        continue;
      }

      return {
        status: outcome.status,
        ok: outcome.status >= 200 && outcome.status < 300,
        headers: outcome.headers,
        finalUrl: currentUrl.toString(),
        bytes: outcome.bytes,
        truncated: outcome.truncated,
      };
    }

    throw new SafeFetchError('too_many_redirects');
  } catch (error) {
    if (error instanceof SafeFetchError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SafeFetchError('timeout');
    }
    throw new SafeFetchError('fetch_failed');
  } finally {
    clearTimeout(timer);
  }
}
