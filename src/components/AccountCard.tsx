// Account sign-in card. Renders nothing when Supabase isn't configured
// (guest-only mode), so the app works identically without env vars.
//
// Two independent methods: Google (one click, primary) and email magic link
// (secondary). They are stacked with an "or" divider so they read as
// alternatives rather than steps of a single flow. Signing in upgrades the seat
// identity to the account id; signing out returns to the guest seat.

import { useState } from 'react';
import { useAccount } from '@/contexts/AccountProvider';
import { signInWithGoogle, signInWithMagicLink, signOut } from '@/services/account';
import { useAuthStore } from '@/stores';

/** Google's multicolour "G" mark — instantly recognisable on the button. */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.86c2.26-2.09 3.56-5.17 3.56-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

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

          {/* Option 1: Google — primary, one click, no typing. */}
          <button
            type="button"
            disabled={busy}
            onClick={() => { void google(); }}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-wood-edge bg-primary px-4 py-2.5 text-sm font-semibold text-parchment transition hover:border-accent hover:bg-accent/10 disabled:opacity-50"
          >
            <GoogleMark className="h-4 w-4" />
            Continue with Google
          </button>

          {/* Divider: communicates that the two methods are alternatives. */}
          <div className="flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-wood-edge/60" />
            <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-taupe">or</span>
            <span className="h-px flex-1 bg-wood-edge/60" />
          </div>

          {/* Option 2: email magic link — needs typing, so it comes second. */}
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => { e.preventDefault(); if (!busy && emailDraft.trim() !== '') void sendLink(); }}
          >
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
              type="submit"
              disabled={busy || emailDraft.trim() === ''}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-primary transition hover:bg-accent-hover disabled:opacity-50"
            >
              Email me a link
            </button>
          </form>

          <p className="text-xs text-taupe">We'll email you a link — no password to remember.</p>

          {status && <p role="status" className="text-xs text-success">{status}</p>}
          {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </section>
  );
}
