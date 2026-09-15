// Resolves the persistent device identity once at startup and gates the app
// until it's known. This guarantees every join-room message carries the final
// seat id, so we never bind to a seat and then switch identities.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { resolveIdentity, type ResolvedIdentity } from '@/services/identity';
import { useAuthStore } from '@/stores';

const IdentityContext = createContext<ResolvedIdentity | null>(null);

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<ResolvedIdentity | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { userId, setUserId } = useAuthStore.getState();

    void resolveIdentity(userId).then((resolved) => {
      if (cancelled) return;
      setUserId(resolved.userId);
      setIdentity(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, []);

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
