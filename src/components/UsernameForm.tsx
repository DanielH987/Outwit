// Unique-username settings form for signed-in accounts. This is the handle
// friends will search you by later, so it is reserved on the account (not the
// device) and rendered only when signed in. Guests keep their display name.

import { useEffect, useState } from 'react';
import { useAuthStore, useProfileStore } from '@/stores';
import {
  claimUsername,
  fetchMyProfile,
  normalizeUsername,
  USERNAME_MAX,
} from '@/services/profile';

export function UsernameForm({
  bare = false,
  onUsernameChange,
}: {
  bare?: boolean;
  /** Called with the claimed handle after a successful save. */
  onUsernameChange?: (username: string) => void;
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [draft, setDraft] = useState('');
  const [current, setCurrent] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    void fetchMyProfile().then((profile) => {
      if (cancelled) return;
      setCurrent(profile?.username ?? null);
    });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const save = async () => {
    const normalized = normalizeUsername(draft);
    if (normalized === null) {
      setError(`Username must be 3–20 letters, numbers, or underscores.`);
      setStatus(null);
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    const { error: err } = await claimUsername(normalized);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setCurrent(normalized);
    setDraft('');
    setStatus(`Saved. Your username is @${normalized}.`);
    useProfileStore.getState().setAccountUsername(normalized);
    onUsernameChange?.(normalized);
  };

  return (
    <section
      aria-label="Username"
      className={bare ? '' : 'mb-6 rounded-xl bg-surface p-4 shadow-lg shadow-black/30'}
      data-testid="username-form"
    >
      {!bare && (
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-parchment">Username</h3>
          <p className="text-xs text-taupe">
            Your unique handle — friends will find you by this.{' '}
            {current ? (
              <>You are <span className="text-parchment">@{current}</span>.</>
            ) : (
              <>You haven't picked one yet.</>
            )}
          </p>
        </div>
      )}

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => { e.preventDefault(); if (!busy) void save(); }}
      >
        <label className="sr-only" htmlFor="profile-username">Username</label>
        <div className="flex min-w-0 flex-1 items-center rounded-lg bg-primary px-3 focus-within:ring-2 focus-within:ring-accent">
          <span className="text-taupe">@</span>
          <input
            id="profile-username"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(null); setStatus(null); }}
            placeholder={current ?? 'yourname'}
            maxLength={USERNAME_MAX}
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent px-2 py-2 text-sm text-parchment outline-none placeholder:text-taupe"
          />
        </div>
        <button
          type="submit"
          disabled={busy || draft.trim() === ''}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-primary transition hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save username'}
        </button>
      </form>

      {status && <p role="status" className="mt-2 text-xs text-success">{status}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    </section>
  );
}
