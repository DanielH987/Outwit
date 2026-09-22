// Signed-in account profile: unique username (the friend-search handle) and
// the public flag. Guests have no username — the profile row is keyed by the
// auth user id. Every function is a no-op in guest-only mode (no Supabase).

import { supabase } from '@/services/supabase';

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;

/** Trim + validate; returns the clean handle or null when invalid. */
export function normalizeUsername(raw: string): string | null {
  const username = raw.trim();
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) return null;
  if (!USERNAME_PATTERN.test(username)) return null;
  return username;
}

/** True when the string is a syntactically valid username. */
export function isValidUsername(raw: string): boolean {
  return normalizeUsername(raw) !== null;
}

export interface PublicProfile {
  id: string;
  username: string | null;
}

/** Fetch the signed-in user's own profile row. Returns null when not signed in. */
export async function fetchMyProfile(): Promise<PublicProfile | null> {
  if (!supabase) return null;
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { id: data.id as string, username: data.username as string | null };
  } catch (err) {
    console.error('[outwit] failed to fetch profile:', err);
    return null;
  }
}

/** Look up a profile by username. Returns null when not found. */
export async function fetchProfileByUsername(username: string): Promise<PublicProfile | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { id: data.id as string, username: data.username as string | null };
  } catch (err) {
    console.error('[outwit] failed to look up profile:', err);
    return null;
  }
}

/**
 * Claim a unique username for the signed-in account. Returns { error } with a
 * user-facing message, or null on success. Only the owner can set their row.
 */
export async function claimUsername(username: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Sign-in is not configured.' };
  const normalized = normalizeUsername(username);
  if (normalized === null) {
    return { error: `Username must be ${USERNAME_MIN}–${USERNAME_MAX} letters, numbers, or underscores.` };
  }
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { error: 'Please sign in first.' };
    const { error } = await supabase
      .from('profiles')
      .update({ username: normalized })
      .eq('id', userId);
    if (error) {
      // Unique violation (code 23505) means someone else already has it.
      if (error.code === '23505') return { error: 'That username is already taken.' };
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    console.error('[outwit] failed to claim username:', err);
    return { error: 'Something went wrong saving your username.' };
  }
}
