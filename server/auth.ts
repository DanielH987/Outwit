// Supabase JWT verification for WebSocket joins.
//
// The project signs access tokens with ES256 (asymmetric). We verify against the
// project's JWKS, fetched once and cached; if only `SUPABASE_JWT_SECRET` is
// configured we fall back to HS256 verification. When neither is configured,
// verification is disabled and guests-only mode applies (join-room never
// requires a token).
//
// Uses the Web Crypto API (`globalThis.crypto.subtle`), available on Node 20+.

import { createPublicKey, createVerify, createHmac, timingSafeEqual } from 'node:crypto';

export interface SupabaseJwtConfig {
  /** e.g. https://<ref>.supabase.co */
  url: string;
  /** Optional legacy shared secret (HS256). */
  jwtSecret?: string;
}

interface JwksKey {
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  kid?: string;
}

interface CachedJwks {
  keys: JwksKey[];
  fetchedAt: number;
}

const JWKS_TTL_MS = 60 * 60 * 1000; // refetch keys hourly
const CLOCK_SKEW_SECONDS = 30;

let jwksCache: CachedJwks | null = null;

function base64UrlToBuffer(value: string): Buffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded + '='.repeat((4 - (padded.length % 4)) % 4), 'base64');
}

function decodeJson<T>(segment: string): T {
  return JSON.parse(base64UrlToBuffer(segment).toString('utf8')) as T;
}

async function fetchJwks(url: string): Promise<JwksKey[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) return jwksCache.keys;
  const res = await fetch(`${url.replace(/\/+$/, '')}/auth/v1/.well-known/jwks.json`);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const body = (await res.json()) as { keys?: JwksKey[] };
  const keys = body.keys ?? [];
  jwksCache = { keys, fetchedAt: Date.now() };
  return keys;
}

function verifyEs256(signingInput: string, signature: Buffer, key: JwksKey): boolean {
  if (key.kty !== 'EC' || key.crv !== 'P-256' || !key.x || !key.y) return false;
  // Build a JWK public key from the coordinates and let Node verify.
  const publicKey = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: key.x, y: key.y }, format: 'jwk' });
  const verifier = createVerify('SHA256');
  verifier.update(signingInput);
  verifier.end();
  return verifier.verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, signature);
}

function verifyHs256(signingInput: string, signature: Buffer, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(signingInput).digest();
  return expected.length === signature.length && timingSafeEqual(expected, signature);
}

export interface VerifiedToken {
  sub: string;
  email: string | null;
}

/**
 * Verify a Supabase access token. Returns the payload on success, or null when
 * the token is malformed, expired, unsigned by this project, or verification is
 * not configured.
 */
export async function verifySupabaseToken(
  token: string,
  config: SupabaseJwtConfig | null
): Promise<VerifiedToken | null> {
  if (!config) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerSegment, payloadSegment, signatureSegment] = parts;
  let header: { alg?: string; kid?: string };
  let payload: { sub?: string; email?: string; exp?: number; aud?: string; iss?: string };
  try {
    header = decodeJson(headerSegment);
    payload = decodeJson(payloadSegment);
  } catch {
    return null;
  }

  // Expiry + audience checks first (cheap), then signature.
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp + CLOCK_SKEW_SECONDS < now) return null;
  if (payload.aud !== 'authenticated') return null;
  if (!payload.sub) return null;

  const signingInput = `${headerSegment}.${payloadSegment}`;
  const signature = base64UrlToBuffer(signatureSegment);

  try {
    if (header.alg === 'ES256') {
      const keys = await fetchJwks(config.url);
      const candidates = header.kid ? keys.filter((k) => k.kid === header.kid) : keys;
      const ok = candidates.some((key) => verifyEs256(signingInput, signature, key));
      if (!ok) return null;
    } else if (header.alg === 'HS256') {
      if (!config.jwtSecret) return null;
      if (!verifyHs256(signingInput, signature, config.jwtSecret)) return null;
    } else {
      return null; // unsupported algorithm
    }
  } catch {
    return null;
  }

  return { sub: payload.sub, email: payload.email ?? null };
}

/** Test helper: clear the JWKS cache. */
export function resetJwksCache(): void {
  jwksCache = null;
}
