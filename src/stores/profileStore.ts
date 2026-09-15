// Device-wide player profile: the display name shown in the players list and
// chat. Persisted to localStorage so it is shared across tabs (the seat id is
// per-tab, but the human's name should follow them everywhere).
//
// Distinct from `authStore`, which owns the per-tab seat identity.
//
// Two name sources, in priority order:
//   1. `displayName` — an explicit choice made in Profile (or seeded from a
//      signed-in account's email). This is the player's real name.
//   2. `guestName`   — an auto-generated `Guest ####` fallback, persisted so a
//      guest keeps the same name across reloads and tabs. Regenerating it each
//      load (the old behavior) silently renamed players on refresh.
//
// Inspired by chess.com, where a username comes from the account and is changed
// in Settings rather than being prompted for in the lobby or during a game.

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

/** Friendly auto-generated guest name, e.g. `Guest 4821`. */
export function guestDisplayName(): string {
  return `Guest ${Math.floor(1000 + Math.random() * 9000)}`;
}

interface ProfileState {
  /** Explicitly chosen name (Profile settings) or seeded from an account. */
  displayName: string | null;
  /** Persisted auto-generated fallback used until a real name is chosen. */
  guestName: string | null;
  /** Returns false (and stores nothing) when the name is invalid. */
  setDisplayName: (name: string) => boolean;
  clearDisplayName: () => void;
  /** Generate and persist a guest name on first use; returns the current one. */
  ensureGuestName: () => string;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      displayName: null,
      guestName: null,
      setDisplayName: (name) => {
        const normalized = normalizeDisplayName(name);
        if (normalized === null) return false;
        set({ displayName: normalized });
        return true;
      },
      clearDisplayName: () => set({ displayName: null }),
      ensureGuestName: () => {
        const existing = get().guestName;
        if (existing) return existing;
        const generated = guestDisplayName();
        set({ guestName: generated });
        return generated;
      },
    }),
    {
      name: 'outwit-profile',
      version: 1,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<ProfileState>;
        return {
          ...state,
          displayName: state.displayName ?? null,
          guestName: state.guestName ?? null,
        } as ProfileState;
      },
    }
  )
);

/** Name to send on the wire: the chosen name, else the persisted guest name. */
export function effectiveDisplayName(): string {
  const { displayName, guestName, ensureGuestName } = useProfileStore.getState();
  return displayName ?? guestName ?? ensureGuestName();
}

/** True once the player has a name they (or their account) actually chose. */
export function hasChosenName(): boolean {
  return useProfileStore.getState().displayName !== null;
}

/**
 * Seed a name from a signed-in account when the player hasn't chosen one.
 * Mirrors chess.com assigning a username at signup. No-op if a name exists.
 */
export function seedDisplayNameFromAccount(email: string | null): void {
  if (hasChosenName()) return;
  const local = (email ?? '').split('@')[0] ?? '';
  // Keep it to safe characters and the same length bounds as manual names.
  const candidate = local.replace(/[^A-Za-z0-9 ._-]/g, '').trim();
  if (candidate.length < DISPLAY_NAME_MIN) return;
  useProfileStore.getState().setDisplayName(candidate.slice(0, DISPLAY_NAME_MAX));
}
