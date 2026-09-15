// Display-name settings form. Lives on the Profile page (the closest thing we
// have to chess.com's Settings → Account), so players set their name in one
// predictable place rather than being asked in the lobby or mid-game.

import { useState } from 'react';
import { DISPLAY_NAME_MAX, normalizeDisplayName, useProfileStore } from '@/stores';

export function DisplayNameForm() {
  const displayName = useProfileStore((s) => s.displayName);
  const guestName = useProfileStore((s) => s.guestName);
  const ensureGuestName = useProfileStore((s) => s.ensureGuestName);
  const setDisplayName = useProfileStore((s) => s.setDisplayName);

  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // What the player is currently called on the wire.
  const current = displayName ?? guestName ?? ensureGuestName();
  const isGuest = displayName === null;

  const save = () => {
    const normalized = normalizeDisplayName(draft);
    if (normalized === null) {
      setError('Name must be 2–20 characters.');
      setStatus(null);
      return;
    }
    setDisplayName(normalized);
    setDraft('');
    setError(null);
    setStatus(`Saved. You'll play as ${normalized}.`);
  };

  return (
    <section
      aria-label="Display name"
      className="mb-6 rounded-xl bg-surface p-4 shadow-lg shadow-black/30"
      data-testid="display-name-form"
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-parchment">Display name</h3>
        <p className="text-xs text-taupe">
          Shown to your opponent and in chat.{' '}
          {isGuest ? (
            <>You're playing as <span className="text-parchment">{current}</span> until you set one.</>
          ) : (
            <>You're playing as <span className="text-parchment">{current}</span>.</>
          )}
        </p>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => { e.preventDefault(); save(); }}
      >
        <label className="sr-only" htmlFor="profile-display-name">Display name</label>
        <input
          id="profile-display-name"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setError(null); setStatus(null); }}
          placeholder={current}
          maxLength={DISPLAY_NAME_MAX}
          className="min-w-0 flex-1 rounded-lg bg-primary px-3 py-2 text-sm text-parchment outline-none placeholder:text-taupe focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={draft.trim() === ''}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-primary transition hover:bg-accent-hover disabled:opacity-50"
        >
          Save name
        </button>
      </form>

      {status && <p role="status" className="mt-2 text-xs text-success">{status}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    </section>
  );
}
