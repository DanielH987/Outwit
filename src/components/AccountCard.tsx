// Account sign-in card. Renders nothing when Supabase isn't configured
// (guest-only mode), so the app works identically without env vars.
//
// Two methods: email magic link and Google OAuth. Signing in upgrades the seat
// identity to the account id; signing out returns to the guest seat.

import { useState } from 'react';
import { useAccount } from '@/contexts/AccountProvider';
import { signInWithGoogle, signInWithMagicLink, signOut } from '@/services/account';
import { useAuthStore } from '@/stores';

export function AccountCard() {
  const { available } = useAccount();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const email = useAuthStore((s) => s.email);

  const [emailDraft, setEmailDraft] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!available) return null;

  const sendLink = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    const { error: err } = await signInWithMagicLink(emailDraft);
    setBusy(false);
    if (err) setError(err);
    else setStatus('Check your email for a sign-in link.');
  };

  const google = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await signInWithGoogle();
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <section
      aria-label="Account"
      className="mb-6 rounded-xl bg-surface p-4 shadow-lg shadow-black/30"
      data-testid="account-card"
    >
      {isAuthenticated ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-parchment">
            Signed in as <span className="font-semibold text-accent">{email ?? 'your account'}</span>
          </p>
          <button
            type="button"
            onClick={() => { void signOut(); }}
            className="rounded-lg border border-wood-edge px-3 py-1.5 text-xs font-semibold transition hover:border-danger hover:text-danger"
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-semibold text-parchment">Sign in to save your games</h3>
            <p className="text-xs text-taupe">
              Optional. Guests can always play; signing in keeps your match history across devices.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="account-email">Email</label>
            <input
              id="account-email"
              type="email"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              placeholder="you@example.com"
              className="min-w-0 flex-1 rounded-lg bg-primary px-3 py-2 text-sm text-parchment outline-none placeholder:text-taupe focus:ring-2 focus:ring-accent"
            />
            <button
              type="button"
              disabled={busy || emailDraft.trim() === ''}
              onClick={() => { void sendLink(); }}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-primary transition hover:bg-accent-hover disabled:opacity-50"
            >
              Email me a link
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => { void google(); }}
              className="rounded-lg border border-wood-edge px-4 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent disabled:opacity-50"
            >
              Continue with Google
            </button>
          </div>
          {status && <p role="status" className="text-xs text-success">{status}</p>}
          {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </section>
  );
}
