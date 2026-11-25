import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { headers } from 'next/headers';

export type RateLimitScope =
  | 'newsletter'
  | 'indexnow_submit'
  | 'key_check'
  | 'sitemap_fetch';

type ScopeConfig = {
  prefix: string;
  limit: number;
  window: `${number} ${'s' | 'm' | 'h' | 'd'}` | `${number}${'s' | 'm' | 'h' | 'd'}`;
  windowMs: number;
};

const DAY_MAX_SUBMISSIONS = Math.max(
  1,
  parseInt(process.env.DAY_MAX_SUBMISSIONS || '10', 10) || 10
);

const SCOPE_CONFIGS: Record<RateLimitScope, ScopeConfig> = {
  newsletter: {
    prefix: 'newsletter:rate-limit',
    limit: DAY_MAX_SUBMISSIONS,
    window: '1d',
    windowMs: 24 * 60 * 60 * 1000,
  },
  indexnow_submit: {
    prefix: 'submitnow:ratelimit:submit',
    limit: Math.max(
      5,
      parseInt(process.env.INDEXNOW_SUBMIT_RATE_LIMIT || '30', 10) || 30
    ),
    window: '10m',
    windowMs: 10 * 60 * 1000,
  },
  key_check: {
    prefix: 'submitnow:ratelimit:key-check',
    limit: Math.max(
      10,
      parseInt(process.env.KEY_CHECK_RATE_LIMIT || '60', 10) || 60
    ),
    window: '10m',
    windowMs: 10 * 60 * 1000,
  },
  sitemap_fetch: {
    prefix: 'submitnow:ratelimit:sitemap-fetch',
    limit: Math.max(
      5,
      parseInt(process.env.SITEMAP_FETCH_RATE_LIMIT || '20', 10) || 20
    ),
    window: '10m',
    windowMs: 10 * 60 * 1000,
  },
};

let redisClient: Redis | null | undefined;
const upstashLimiters = new Map<RateLimitScope, Ratelimit>();

// Bounded in-memory sliding window fallback used in production when Upstash
// Redis is not configured, preventing unrestricted outbound abuse from a
// single deployment instance.
const MEMORY_MAX_KEYS = 2000;
const memoryWindows = new Map<string, number[]>();

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function getUpstashLimiter(scope: RateLimitScope): Ratelimit | null {
  const redis = getRedisClient();
  if (!redis) return null;

  let limiter = upstashLimiters.get(scope);
  if (!limiter) {
    const config = SCOPE_CONFIGS[scope];
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.limit, config.window),
      prefix: config.prefix,
    });
    upstashLimiters.set(scope, limiter);
  }
  return limiter;
}

function checkMemoryRateLimit(
  scope: RateLimitScope,
  identifier: string
): { allowed: boolean; retryAfterSeconds?: number } {
  const config = SCOPE_CONFIGS[scope];
  const now = Date.now();
  const cutoff = now - config.windowMs;
  const bucketKey = `${scope}:${identifier}`;

  const existing = (memoryWindows.get(bucketKey) ?? []).filter(
    (timestamp) => timestamp > cutoff
  );

  if (existing.length >= config.limit) {
    memoryWindows.set(bucketKey, existing);
    const oldest = existing[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + config.windowMs - now) / 1000)
    );
    return { allowed: false, retryAfterSeconds };
  }

  existing.push(now);
  if (memoryWindows.size >= MEMORY_MAX_KEYS && !memoryWindows.has(bucketKey)) {
    const firstKey = memoryWindows.keys().next().value;
    if (firstKey) memoryWindows.delete(firstKey);
  }
  memoryWindows.set(bucketKey, existing);
  return { allowed: true };
}

async function resolveClientIp(): Promise<string> {
  const headersList = await headers();
  const realIp = headersList.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  return 'unknown';
}

export async function checkActionRateLimit(
  scope: RateLimitScope
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const ip = await resolveClientIp();
  const limiter = getUpstashLimiter(scope);

  if (limiter) {
    try {
      const result = await limiter.limit(ip);
      if (!result.success) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((result.reset - Date.now()) / 1000)
        );
        return { allowed: false, retryAfterSeconds };
      }
      return { allowed: true };
    } catch {
      // Fail open to memory limiter if Redis is transiently unreachable.
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return checkMemoryRateLimit(scope, ip);
  }

  return { allowed: true };
}

// Legacy newsletter rate limit helper kept for backward compatibility
export async function checkRateLimit() {
  const result = await checkActionRateLimit('newsletter');
  if (!result.allowed) {
    throw new Error('Too many submissions, please try again later');
  }
}
