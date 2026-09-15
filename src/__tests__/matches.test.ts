// Match recording to Supabase REST: config gating, payload shape, and
// graceful failure (gameplay must never depend on the database).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { matchRecorderConfig, recordMatch } from '../../server/matches';

const input = {
  roomId: 'K7M2QP',
  whiteId: 'user_white',
  blackId: 'acct-uuid-black',
  whiteName: 'Alice',
  blackName: 'Bob',
  winner: 'white' as const,
  reason: 'base-filled',
  moveCount: 42,
};

describe('match recording', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('is disabled without env vars', () => {
    expect(matchRecorderConfig()).toBeNull();
  });

  it('is enabled when both env vars are present', () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    expect(matchRecorderConfig()).toEqual({ url: 'https://test.supabase.co', serviceRoleKey: 'service-key' });
  });

  it('does nothing when not configured (returns false, no fetch)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await recordMatch(input, null)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs the match row with service-role auth', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    const ok = await recordMatch(input, { url: 'https://test.supabase.co/', serviceRoleKey: 'service-key' });
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://test.supabase.co/rest/v1/matches');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).apikey).toBe('service-key');
    expect(JSON.parse(init.body as string)).toEqual({
      room_id: 'K7M2QP',
      white_id: 'user_white',
      black_id: 'acct-uuid-black',
      white_name: 'Alice',
      black_name: 'Bob',
      winner: 'white',
      reason: 'base-filled',
      move_count: 42,
    });
  });

  it('swallows HTTP errors and reports false', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await recordMatch(input, { url: 'https://x.supabase.co', serviceRoleKey: 'k' })).toBe(false);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('swallows network errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await recordMatch(input, { url: 'https://x.supabase.co', serviceRoleKey: 'k' })).toBe(false);
    spy.mockRestore();
  });
});
