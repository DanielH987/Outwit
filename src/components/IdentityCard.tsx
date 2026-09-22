// Identity card: the player's public face (flag + one name) shown as the card's
// header. Clicking the name opens the editor inline — for signed-in accounts
// that's the unique username (the account's only name), for guests the local
// display name. Clicking the flag opens the modal. The account sign-in is a
// compact footer.

import { useState } from 'react';
import { AccountCard } from '@/components/AccountCard';
import { CountryFlag } from '@/components/CountryFlag';
import { DisplayNameForm } from '@/components/DisplayNameForm';
import { FlagPicker } from '@/components/FlagPicker';
import { UsernameForm } from '@/components/UsernameForm';
import { useAuthStore, useProfileStore } from '@/stores';

type Editing = 'name' | 'flag' | null;

export function IdentityCard() {
  const accountUsername = useProfileStore((s) => s.accountUsername);
  const displayName = useProfileStore((s) => s.displayName);
  const guestName = useProfileStore((s) => s.guestName);
  const ensureGuestName = useProfileStore((s) => s.ensureGuestName);
  const countryCode = useProfileStore((s) => s.countryCode);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [editing, setEditing] = useState<Editing>(null);

  const name = accountUsername ?? displayName ?? guestName ?? ensureGuestName();
  const flag = countryCode ? <CountryFlag code={countryCode} className="text-xl" /> : null;

  return (
    <section
      aria-label="Identity"
      className="rounded-xl bg-surface p-4 shadow-lg shadow-black/30"
      data-testid="identity-card"
    >
      {/* Public face: the one name. The flag button appears only once a flag is
          set — no placeholder. To add a flag, open the name editor (below). */}
      <div className="flex flex-wrap items-center gap-2">
        {flag && (
          <button
            type="button"
            onClick={() => setEditing(editing === 'flag' ? null : 'flag')}
            aria-label="Edit flag"
            title="Edit flag"
            className="rounded px-0.5 py-0.5 text-lg leading-none text-taupe/60 transition hover:bg-primary/40"
          >
            {flag}
          </button>
        )}

        <button
          type="button"
          onClick={() => setEditing(editing === 'name' ? null : 'name')}
          aria-label={isAuthenticated ? 'Edit username' : 'Edit name'}
          title={isAuthenticated ? 'Edit username' : 'Edit name'}
          className="rounded px-0.5 py-0.5 text-lg font-bold text-parchment underline-offset-4 transition hover:bg-primary/40 hover:underline"
        >
          <span data-testid="identity-name">{name}</span>
        </button>
      </div>

      <p className="mt-1 text-xs text-taupe">
        {isAuthenticated
          ? 'Your unique username is your name everywhere you play.'
          : 'This device-wide name is shown to your opponent and in chat.'}
      </p>

      {/* Inline editor for the name (signed-in = username, guest = display name).
          The flag control lives here too, so there's no placeholder in the header. */}
      {editing === 'name' && isAuthenticated && (
        <div className="mt-3 rounded-lg bg-primary/30 p-3">
          <UsernameForm bare onUsernameChange={() => setEditing(null)} />
        </div>
      )}
      {editing === 'name' && !isAuthenticated && (
        <div className="mt-3 rounded-lg bg-primary/30 p-3">
          <DisplayNameForm bare onSaved={() => setEditing(null)} />
        </div>
      )}
      {editing === 'name' && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setEditing('flag')}
            className="rounded px-2 py-1 text-xs text-taupe transition hover:bg-primary/40 hover:text-parchment"
          >
            {countryCode ? (
              <>
                {flag} Change flag
              </>
            ) : (
              <>
                <span aria-hidden className="mr-1.5 inline-block h-3 w-4 rounded-[0.15em] border border-dashed border-taupe/50 align-[-0.1em]" />
                Add flag
              </>
            )}
          </button>
        </div>
      )}

      <FlagPicker open={editing === 'flag'} onClose={() => setEditing(null)} />

      <div className="mt-4 border-t border-wood-edge/60 pt-3">
        <AccountCard bare />
      </div>
    </section>
  );
}
