// Device-wide player profile: the display name shown in the players list and
// chat. Persisted to localStorage so it is shared across tabs (the seat id is
// per-tab, but the human's name should follow them everywhere).
//
// Distinct from `authStore`, which owns the per-tab seat identity.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 20;

/** Trim and validate; returns the clean name or null when invalid. */
export function normalizeDisplayName(raw: string): string | null {
  const name = raw.trim();
  if (name.length < DISPLAY_NAME_MIN || name.length > DISPLAY_NAME_MAX) return null;
  return name;
}

/** Friendly fallback when a player never sets a name, e.g. `Guest 4821`. */
export function guestDisplayName(): string {
  return `Guest ${Math.floor(1000 + Math.random() * 9000)}`;
}

interface ProfileState {
  displayName: string | null;
  setDisplayName: (name: string) => boolean;
  clearDisplayName: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      displayName: null,
      /** Returns false (and stores nothing) when the name is invalid. */
      setDisplayName: (name) => {
        const normalized = normalizeDisplayName(name);
        if (normalized === null) return false;
        set({ displayName: normalized });
        return true;
      },
      clearDisplayName: () => set({ displayName: null }),
    }),
    { name: 'outwit-profile' }
  )
);

/** Name to send on the wire: the stored name or a generated guest fallback.
 *  The fallback is generated once per tab so re-joins and chat stay consistent. */
let guestFallback: string | null = null;

export function effectiveDisplayName(): string {
  const stored = useProfileStore.getState().displayName;
  if (stored) return stored;
  guestFallback ??= guestDisplayName();
  return guestFallback;
}

/** Test helper: forget the per-tab guest fallback. */
export function resetGuestFallback(): void {
  guestFallback = null;
}
