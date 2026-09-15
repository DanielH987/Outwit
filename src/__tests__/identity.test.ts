// Device identity: first tab owns the device id, extra tabs get ephemeral ids,
// no-Web-Locks browsers keep the per-tab id, and mid-session migration works.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEVICE_ID_KEY, getOrCreateDeviceId, resolveIdentity, SEAT_LOCK_NAME } from '../services/identity';

/** In-memory localStorage stand-in. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => { map.delete(k); },
    setItem: (k: string, v: string) => { map.set(k, String(v)); },
  } as Storage;
}

/** Minimal Web Locks mock: first acquisition succeeds, later ones get null. */
function fakeLocks(available = true) {
  const heldNames = new Set<string>();
  return {
    request: vi.fn(
      async (name: string, _opts: { ifAvailable: boolean }, cb: (lock: unknown) => Promise<void>) => {
        const canAcquire = available && !heldNames.has(name);
        if (canAcquire) heldNames.add(name);
        // Never resolves while held (mirrors real Web Locks semantics).
        await cb(canAcquire ? { name } : null);
      }
    ),
  };
}

describe('device identity', () => {
  let store: Storage;

  beforeEach(() => {
    store = fakeStorage();
    vi.stubGlobal('localStorage', store);
    vi.stubGlobal('window', { addEventListener: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('generates a device id once and reuses it', () => {
    const first = getOrCreateDeviceId();
    expect(first).toMatch(/^user_/);
    expect(store.getItem(DEVICE_ID_KEY)).toBe(first);
    expect(getOrCreateDeviceId()).toBe(first);
  });

  it('first tab (lock acquired) uses the device id', async () => {
    vi.stubGlobal('navigator', { locks: fakeLocks() });
    const resolved = await resolveIdentity('user_tab1');
    expect(resolved.role).toBe('device');
    expect(resolved.userId).toBe(store.getItem(DEVICE_ID_KEY));
  });

  it('adopts the current per-tab id as the device id when none exists (migration)', async () => {
    vi.stubGlobal('navigator', { locks: fakeLocks() });
    const resolved = await resolveIdentity('user_existing_tab');
    expect(resolved.userId).toBe('user_existing_tab');
    expect(store.getItem(DEVICE_ID_KEY)).toBe('user_existing_tab');
  });

  it('second tab (lock unavailable) gets an ephemeral id, distinct from the device id', async () => {
    const locks = fakeLocks();
    // Simulate the first tab holding the seat lock already (fire-and-forget:
    // its callback never resolves, exactly like a live tab holding the lock).
    void locks.request(SEAT_LOCK_NAME, { ifAvailable: true }, async () => {
      await new Promise(() => {});
    });
    vi.stubGlobal('navigator', { locks });

    const deviceId = getOrCreateDeviceId();
    const second = await resolveIdentity('user_same_tab_storage');
    expect(second.role).toBe('tab');
    expect(second.userId).not.toBe(deviceId);
    expect(second.userId).toMatch(/^user_/);
  });

  it('falls back to the current per-tab id when Web Locks are unavailable', async () => {
    vi.stubGlobal('navigator', {});
    const resolved = await resolveIdentity('user_no_locks');
    expect(resolved.role).toBe('fallback');
    expect(resolved.userId).toBe('user_no_locks');
  });

  it('degrades safely when the lock request throws', async () => {
    vi.stubGlobal('navigator', {
      locks: { request: vi.fn(async () => { throw new Error('denied'); }) },
    });
    const resolved = await resolveIdentity('user_denied');
    expect(resolved.role).toBe('tab');
    expect(resolved.userId).toMatch(/^user_/);
  });
});
