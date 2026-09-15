// Supabase client singleton.
//
// Auth is optional: when the env vars are absent (local dev without a project,
// tests, CI), `supabase` is null and every feature degrades to guest-only mode.
// The anon key is public by design; never put the service-role key in a
// VITE_-prefixed variable.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env?.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined;

export const authEnabled = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = authEnabled
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Magic links land back on the app with `?code=…`; supabase-js handles
        // the exchange in `detectSessionInUrl`.
        detectSessionInUrl: true,
      },
    })
  : null;
