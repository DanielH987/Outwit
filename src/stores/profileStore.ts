// Device-wide player profile: the single name shown in the players list and
// chat. Persisted to localStorage so it is shared across tabs (the seat id is
// per-tab, but the human's name should follow them everywhere).
//
// One name per player:
//   1. `accountUsername` — a signed-in account's unique handle (also stored in
//      Supabase, so it follows the player across devices). This is the wire name
//      while signed in.
//   2. `displayName`    — a guest's chosen name, or an explicit local name.
//   3. `guestName`      — the auto-generated `Guest ####` fallback, persisted so
//      a guest keeps the same name across reloads and tabs.
//
// Distinct from `authStore`, which owns the per-tab seat identity.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { normalizeCountryCode } from '@/utils/flags';

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
  /** A signed-in account's unique handle (mirrors `profiles.username`). */
  accountUsername: string | null;
  /** A guest's explicitly chosen name (or a local name override). */
  displayName: string | null;
  /** Persisted auto-generated fallback used until a real name is chosen. */
  guestName: string | null;
  /** Two-letter ISO 3166-1 country code shown next to the name (flag icon). */
  countryCode: string | null;
  /** Set the account handle (cache synced from Supabase on sign-in). */
  setAccountUsername: (username: string | null) => void;
  /** Returns false (and stores nothing) when the name is invalid. */
  setDisplayName: (name: string) => boolean;
  clearDisplayName: () => void;
  /** Sets the flag; stores nothing when the code is invalid. */
  setCountryCode: (code: string) => boolean;
  /** Generate and persist a guest name on first use; returns the current one. */
  ensureGuestName: () => string;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      accountUsername: null,
      displayName: null,
      guestName: null,
      countryCode: null,
      setAccountUsername: (username) => set({ accountUsername: username }),
      setDisplayName: (name) => {
        const normalized = normalizeDisplayName(name);
        if (normalized === null) return false;
        set({ displayName: normalized });
        return true;
      },
      clearDisplayName: () => set({ displayName: null }),
      setCountryCode: (code) => {
        const normalized = normalizeCountryCode(code);
        if (normalized === null) return false;
        set({ countryCode: normalized });
        return true;
      },
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
          accountUsername: state.accountUsername ?? null,
          displayName: state.displayName ?? null,
          guestName: state.guestName ?? null,
          countryCode: state.countryCode ?? null,
        } as ProfileState;
      },
    }
  )
);

/**
 * Name to send on the wire: a signed-in account's unique handle, else the
 * guest's chosen name, else the persisted auto-generated guest fallback.
 */
export function effectiveDisplayName(): string {
  const { accountUsername, displayName, guestName, ensureGuestName } = useProfileStore.getState();
  return accountUsername ?? displayName ?? guestName ?? ensureGuestName();
}

/** True once the player has a name they (or their account) actually chose. */
export function hasChosenName(): boolean {
  const { accountUsername, displayName } = useProfileStore.getState();
  return accountUsername !== null || displayName !== null;
}

/** Whether the account handle is currently the effective name. */
export function hasAccountName(): boolean {
  return useProfileStore.getState().accountUsername !== null;
}

/**
 * Cache the signed-in account's unique handle on this device (mirror of
 * `profiles.username`), so the name shown on the wire follows the account
 * across devices. No-op when the account has no handle yet.
 */
export function syncAccountUsername(username: string | null): void {
  useProfileStore.getState().setAccountUsername(username);
}

/** Clear the cached account handle on sign-out. */
export function clearAccountUsername(): void {
  useProfileStore.getState().setAccountUsername(null);
}

/**
 * Derive a username-style handle from an account email (e.g. alice@example.com
 * → `alice`) when the account has no username yet. Mirrors chess.com assigning
 * a username at signup; no-op if the account already has one.
 */
export function suggestUsernameFromAccount(email: string | null): string | null {
  if (hasAccountName()) return null;
  const local = (email ?? '').split('@')[0] ?? '';
  // Keep it to safe characters and the same length bounds as manual names.
  const candidate = local.replace(/[^A-Za-z0-9_.-]/g, '').trim();
  if (candidate.length < 3) return null;
  return candidate.slice(0, 20);
}

/** The device-wide flag code to send on the wire (null when unset). */
export function effectiveCountryCode(): string | null {
  return useProfileStore.getState().countryCode;
}
