// Account (Supabase Auth) integration: magic-link email and Google OAuth.
// Every function is a no-op when Supabase isn't configured (guest-only mode).
//
// On sign-in we also sync the account's unique username into profileStore so
// the wire name follows the account across devices.

import { supabase, authEnabled } from '@/services/supabase';
import { claimUsername, fetchMyProfile } from '@/services/profile';
import { clearAccountUsername, suggestUsernameFromAccount, syncAccountUsername, useAuthStore } from '@/stores';

export { authEnabled };

export interface AccountInfo {
  id: string;
  email: string | null;
  accessToken: string | null;
}

/** Current session, if any. Returns null in guest-only mode. */
export async function getSession(): Promise<AccountInfo | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    accessToken: session.access_token,
  };
}

/** Apply a session to the auth store (seat id becomes the account id). */
export function applyAccount(info: AccountInfo | null): void {
  const store = useAuthStore.getState();
  if (info) {
    store.setAccount(info.id, info.email, info.accessToken);
    // Load the account's unique username into profileStore; guests keep the
    // local name. Non-blocking: the header still renders the guest/old name
    // until the profile arrives.
    void loadAccountUsername();
  } else {
    store.clearAccount();
    clearAccountUsername();
  }
}

/** Fetch the account's username (claiming one from the email if unset). */
export async function loadAccountUsername(): Promise<void> {
  const profile = await fetchMyProfile();
  if (!profile) return;
  if (profile.username) {
    syncAccountUsername(profile.username);
    return;
  }
  // No handle yet: seed one from the email so the name is stable across
  // devices, then claim it. If it's taken, keep the suggestion for the header.
  const suggested = suggestUsernameFromAccount(useAuthStore.getState().email);
  if (!suggested) return;
  const { error } = await claimUsername(suggested);
  if (!error) syncAccountUsername(suggested);
}

/** Send a magic-link email. Redirects back to the current origin. */
export async function signInWithMagicLink(email: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Sign-in is not configured.' };
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: window.location.origin },
  });
  return { error: error?.message ?? null };
}

/** Start Google OAuth. Redirects the browser; returns only on error. */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Sign-in is not configured.' };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
  useAuthStore.getState().clearAccount();
  clearAccountUsername();
}

/**
 * Subscribe to auth changes (sign-in, refresh, sign-out) and sync the store.
 * Returns an unsubscribe function; does nothing in guest-only mode.
 */
export function subscribeToAuth(onChange?: (info: AccountInfo | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const info: AccountInfo | null = session?.user
      ? {
          id: session.user.id,
          email: session.user.email ?? null,
          accessToken: session.access_token,
        }
      : null;
    applyAccount(info);
    onChange?.(info);
  });
  return () => data.subscription.unsubscribe();
}
