import crypto from 'node:crypto';

const TOKEN_VERSION = 'v1';

function getSecret(overrideSecret?: string): string | null {
  const secret =
    overrideSecret ??
    process.env.UNSUBSCRIBE_SECRET ??
    process.env.RESEND_API_KEY ??
    '';
  const trimmed = secret.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function signEmailPayload(encodedEmail: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${TOKEN_VERSION}.${encodedEmail}`)
    .digest('base64url');
}

export function createUnsubscribeToken(
  normalizedEmail: string,
  secretOverride?: string
): string {
  const secret = getSecret(secretOverride);
  if (!secret) {
    throw new Error('Unsubscribe signing secret is not configured');
  }

  const encodedEmail = Buffer.from(normalizedEmail, 'utf-8').toString('base64url');
  const signature = signEmailPayload(encodedEmail, secret);
  return `${TOKEN_VERSION}.${encodedEmail}.${signature}`;
}

export function verifyUnsubscribeToken(
  token: string,
  secretOverride?: string
): string | null {
  const secret = getSecret(secretOverride);
  if (!secret || !token) return null;

  const parts = token.trim().split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) {
    return null;
  }

  const [, encodedEmail, providedSignature] = parts;
  if (!encodedEmail || !providedSignature) return null;

  const expectedSignature = signEmailPayload(encodedEmail, secret);
  const providedBuf = Buffer.from(providedSignature, 'utf-8');
  const expectedBuf = Buffer.from(expectedSignature, 'utf-8');

  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const email = Buffer.from(encodedEmail, 'base64url').toString('utf-8');
    return email || null;
  } catch {
    return null;
  }
}
