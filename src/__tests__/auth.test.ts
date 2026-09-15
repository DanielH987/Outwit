// Supabase JWT verification: ES256 via JWKS, HS256 via shared secret, expiry,
// audience, impersonation-relevant claims, and disabled-mode behavior.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync, createSign, createHmac } from 'node:crypto';
import { resetJwksCache, verifySupabaseToken, type SupabaseJwtConfig } from '../../server/auth';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const publicJwk = publicKey.export({ format: 'jwk' }) as { kty: string; crv: string; x: string; y: string };
const KID = 'test-key-1';
const SUPABASE_URL = 'https://test.supabase.co';

function b64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

interface Claims {
  sub?: string;
  email?: string;
  exp?: number;
  aud?: string;
  alg?: string;
}

function signEs256(claims: Claims): string {
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: KID, typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      sub: 'user-account-uuid',
      email: 'player@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: 'authenticated',
      ...claims,
    })
  );
  const signingInput = `${header}.${payload}`;
  const signer = createSign('SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${b64url(signature)}`;
}

function signHs256(claims: Claims, secret: string): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      sub: 'hs-user',
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: 'authenticated',
      ...claims,
    })
  );
  const signingInput = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(signingInput).digest();
  return `${signingInput}.${b64url(signature)}`;
}

const config: SupabaseJwtConfig = { url: SUPABASE_URL };

describe('verifySupabaseToken', () => {
  beforeEach(() => {
    resetJwksCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ keys: [{ ...publicJwk, kid: KID, ext: true, key_ops: ['verify'], use: 'sig' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetJwksCache();
  });

  it('accepts a valid ES256 token and returns the subject', async () => {
    const token = signEs256({});
    const result = await verifySupabaseToken(token, config);
    expect(result).toEqual({ sub: 'user-account-uuid', email: 'player@example.com' });
  });

  it('rejects an expired token', async () => {
    const token = signEs256({ exp: Math.floor(Date.now() / 1000) - 3600 });
    expect(await verifySupabaseToken(token, config)).toBeNull();
  });

  it('rejects a token with the wrong audience', async () => {
    const token = signEs256({ aud: 'anon' });
    expect(await verifySupabaseToken(token, config)).toBeNull();
  });

  it('rejects a token signed by a different key', async () => {
    const other = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const { createSign: cs } = await import('node:crypto');
    const header = b64url(JSON.stringify({ alg: 'ES256', kid: KID }));
    const payload = b64url(JSON.stringify({ sub: 'attacker', exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated' }));
    const signer = cs('SHA256');
    signer.update(`${header}.${payload}`);
    signer.end();
    const signature = signer.sign({ key: other.privateKey, dsaEncoding: 'ieee-p1363' });
    const token = `${header}.${payload}.${b64url(signature)}`;
    expect(await verifySupabaseToken(token, config)).toBeNull();
  });

  it('rejects malformed tokens', async () => {
    expect(await verifySupabaseToken('not-a-jwt', config)).toBeNull();
    expect(await verifySupabaseToken('a.b', config)).toBeNull();
  });

  it('returns null when auth is not configured', async () => {
    expect(await verifySupabaseToken(signEs256({}), null)).toBeNull();
  });

  it('supports HS256 when a shared secret is configured', async () => {
    const secret = 'legacy-shared-secret';
    const token = signHs256({}, secret);
    expect(await verifySupabaseToken(token, { url: SUPABASE_URL, jwtSecret: secret })).toEqual({
      sub: 'hs-user',
      email: null,
    });
  });

  it('rejects HS256 when no shared secret is configured', async () => {
    const token = signHs256({}, 'anything');
    expect(await verifySupabaseToken(token, config)).toBeNull();
  });

  it('rejects unsupported algorithms', async () => {
    const header = b64url(JSON.stringify({ alg: 'none' }));
    const payload = b64url(JSON.stringify({ sub: 'x', exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated' }));
    expect(await verifySupabaseToken(`${header}.${payload}.`, config)).toBeNull();
  });
});
