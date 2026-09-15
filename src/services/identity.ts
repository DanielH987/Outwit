// Persistent device identity.
//
// The seat id sent to the server (`JoinRoomPayload.userId`) determines which
// side a client re-binds to. Historically it was per-tab (sessionStorage), so
// closing the tab lost the seat. Now:
//
// - A device id lives in localStorage and survives tab close/reopen.
// - Web Locks decide which tab "owns" the device id: the first tab holds a
//   lock named `outwit-seat` for its lifetime and uses the device id; extra
//   tabs (lock unavailable) get an ephemeral id, so two tabs stay two players.
// - Browsers without Web Locks keep the old per-tab behavior (the caller keeps
//   its existing sessionStorage id).
//
// This module is framework-free and testable: no React imports.

import { generateId } from '@/utils/id';

export const DEVICE_ID_KEY = 'outwit-device-id';
export const SEAT_LOCK_NAME = 'outwit-seat';

/** LocalStorage shim so tests and SSR don't explode on missing globals. */
function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // e.g. storage disabled by the browser
  }
}

export function getOrCreateDeviceId(): string {
  const store = storage();
  const existing = store?.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = generateId('user');
  try {
    store?.setItem(DEVICE_ID_KEY, id);
  } catch {
    // Private mode may refuse writes; the id still works for this page load.
  }
  return id;
}

export type IdentityRole = 'device' | 'tab' | 'fallback';

export interface ResolvedIdentity {
  userId: string;
  role: IdentityRole;
}

interface LockManagerLike {
  request(
    name: string,
    options: { ifAvailable: boolean },
    callback: (lock: unknown) => Promise<void>
  ): Promise<void>;
}

/**
 * Resolve this tab's identity.
 *
 * @param currentUserId The id currently in the auth store (e.g. the tab's
 *   sessionStorage id). Used as the fallback when Web Locks are unavailable.
 * @param adoptDeviceId When true (default), the existing per-tab id becomes
 *   the device id if no device id exists yet — a seamless migration for
 *   players who are mid-game when this ships.
 */
export async function resolveIdentity(
  currentUserId: string,
  adoptDeviceId = true
): Promise<ResolvedIdentity> {
  const store = storage();
  const locks = (navigator as Navigator & { locks?: LockManagerLike }).locks;

  if (store && adoptDeviceId && !store.getItem(DEVICE_ID_KEY)) {
    // Migrate: keep the player's current seat id as their device id, so the
    // first tab after this ships resolves to the same id (no re-seat).
    try {
      store.setItem(DEVICE_ID_KEY, currentUserId);
    } catch {
      // Ignore write failures; we fall through to the normal path.
    }
  }

  const deviceId = getOrCreateDeviceId();

  if (!locks?.request) {
    return { userId: currentUserId, role: 'fallback' };
  }

  // Hold the lock for the lifetime of this tab (never resolve while held).
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });

  let settleAcquisition: (owner: boolean) => void = () => {};
  const acquisition = new Promise<boolean>((resolve) => {
    settleAcquisition = resolve;
  });

  void locks
    .request(SEAT_LOCK_NAME, { ifAvailable: true }, async (lock) => {
      settleAcquisition(lock !== null);
      if (lock !== null) await held;
    })
    .catch(() => {
      // Lock API failures degrade to the per-tab fallback.
      settleAcquisition(false);
    });

  const isOwner = await acquisition;

  if (isOwner) {
    // Release on unload so a reopened tab can claim the device id.
    window.addEventListener('pagehide', () => release(), { once: true });
    return { userId: deviceId, role: 'device' };
  }

  return { userId: generateId('user'), role: 'tab' };
}
