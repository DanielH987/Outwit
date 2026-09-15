// Resolves the persistent device identity once at startup and gates the app
// until it's known. This guarantees every join-room message carries the final
// seat id, so we never bind to a seat and then switch identities.
//
// When a Supabase account session exists, the account id is the seat id
// (`authStore.accountId`); identity resolution only fills in the guest id that
// is used after sign-out / before sign-in.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { resolveIdentity, type ResolvedIdentity } from '@/services/identity';
import { useAuthStore } from '@/stores';
import { useAccount } from '@/contexts/AccountProvider';

const IdentityContext = createContext<ResolvedIdentity | null>(null);

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<ResolvedIdentity | null>(null);
  const { ready: accountReady } = useAccount();

  useEffect(() => {
    if (!accountReady) return;
    let cancelled = false;

    const run = async () => {
      // The persisted per-tab id may be an account id; the guest id is the
      // fallback to resolve against.
      const store = useAuthStore.getState();
      const resolved = await resolveIdentity(store.guestUserId);
      if (cancelled) return;
      store.setGuestUserId(resolved.userId);
      setIdentity(
        store.accountId
          ? { userId: store.accountId, role: 'device' }
          : resolved
      );
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [accountReady]);

  if (!identity) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-primary text-taupe">
        <p>Loading…</p>
      </div>
    );
  }

  return <IdentityContext.Provider value={identity}>{children}</IdentityContext.Provider>;
}

/** The resolved identity; throws when used outside the provider. */
export function useIdentity(): ResolvedIdentity {
  const context = useContext(IdentityContext);
  if (!context) {
    throw new Error('useIdentity must be used within an IdentityProvider');
  }
  return context;
}
