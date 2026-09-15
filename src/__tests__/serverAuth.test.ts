// Server auth integration: a verified token keys the seat by its `sub` (the
// client cannot choose it), mismatched claims are rejected, and guests keep
// working without a token. Uses a locally-generated ES256 keypair and a stubbed
// JWKS endpoint so no real Supabase project is needed.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { startServer } from '../../server/index';
import { resetJwksCache } from '../../server/auth';
import type { ServerMessage } from '../types';

const PORT = 3459;
const KID = 'auth-test-key';
const SUPABASE_URL = 'https://auth-test.supabase.co';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const publicJwk = publicKey.export({ format: 'jwk' }) as { kty: string; crv: string; x: string; y: string };

function b64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signToken(sub: string): string {
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: KID }));
  const payload = b64url(
    JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated' })
  );
  const signer = createSign('SHA256');
  signer.update(`${header}.${payload}`);
  signer.end();
  return `${header}.${payload}.${b64url(signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }))}`;
}

interface TestClient {
  ws: WebSocket;
  userId: string;
  send: (type: string, payload: unknown) => void;
  nextBy: (type: string, check?: (p: any) => boolean, ms?: number) => Promise<ServerMessage>;
  errors: () => Promise<ServerMessage[]>;
  closeNow: () => void;
}

function makeClient(ws: WebSocket, userId: string): TestClient {
  const buffer: ServerMessage[] = [];
  ws.on('message', (raw) => buffer.push(JSON.parse(raw.toString()) as ServerMessage));
  return {
    ws,
    userId,
    send: (type, payload) => ws.send(JSON.stringify({ type, payload })),
    nextBy: (type, check, ms = 2500) =>
      new Promise((res, rej) => {
        const started = Date.now();
        const poll = () => {
          const idx = buffer.findIndex((m) => m.type === type && (!check || check(m.payload)));
          if (idx !== -1) return res(buffer.splice(idx, 1)[0]);
          if (Date.now() - started > ms) return rej(new Error(`timeout for ${type}`));
          setTimeout(poll, 10);
        };
        void poll();
      }),
    errors: async () => {
      await new Promise((r) => setTimeout(r, 50));
      return buffer.filter((m) => m.type === 'error');
    },
    closeNow: () => ws.close(),
  };
}

async function connect(): Promise<TestClient> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'connected') resolve(makeClient(ws, msg.payload.userId));
    });
  });
}

describe('server token auth', () => {
  let server: ReturnType<typeof startServer>;
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ keys: [{ ...publicJwk, kid: KID, use: 'sig' }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  );

  beforeAll(() => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    vi.stubGlobal('fetch', fetchMock);
    server = startServer(PORT);
  });

  afterAll(() => {
    server.close();
    vi.unstubAllGlobals();
    delete process.env.SUPABASE_URL;
  });

  beforeEach(() => {
    resetJwksCache();
    fetchMock.mockClear();
  });

  afterEach(() => {
    resetJwksCache();
  });

  it('keys the seat by the verified token subject, not the claimed id', async () => {
    const client = await connect();
    const token = signToken('account-uuid-1');
    client.send('join-room', {
      roomId: 'auth-seat',
      userId: 'account-uuid-1',
      username: 'Alice',
      token,
    });
    const update = await client.nextBy('room-update');
    expect((update.payload as any).players[0]).toMatchObject({ userId: 'account-uuid-1', side: 'white' });
    client.closeNow();
  });

  it('rejects an identity mismatch (claimed id ≠ token subject)', async () => {
    const client = await connect();
    client.send('join-room', {
      roomId: 'auth-mismatch',
      userId: 'someone-else',
      username: 'Mallory',
      token: signToken('account-uuid-2'),
    });
    const errors = await client.errors();
    expect(errors.some((e) => (e.payload as any).message === 'Identity mismatch.')).toBe(true);
    client.closeNow();
  });

  it('rejects an invalid token', async () => {
    const client = await connect();
    client.send('join-room', { roomId: 'auth-bad', userId: 'x', username: 'X', token: 'garbage.token.here' });
    const errors = await client.errors();
    expect(errors.length).toBeGreaterThan(0);
    client.closeNow();
  });

  it('still allows guest joins without a token', async () => {
    const client = await connect();
    client.send('join-room', { roomId: 'auth-guest', userId: client.userId, username: 'Guest' });
    const update = await client.nextBy('room-update');
    expect((update.payload as any).players[0]).toMatchObject({ userId: client.userId, side: 'white' });
    client.closeNow();
  });
});
