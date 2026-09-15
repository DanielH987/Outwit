// Bridges Supabase auth into the app: loads any existing session once, then
// keeps the auth store in sync with sign-in/refresh/sign-out events.
//
// Seat separation: a signed-in account's seat id is its Supabase `sub`, so the
// same account re-binds to its seat across devices. Guests keep the device/tab
// identity from IdentityProvider. The provider itself renders nothing visible.

import { useEffect, type ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';
import { authEnabled, applyAccount, getSession, subscribeToAuth } from '@/services/account';

interface AuthContextValue {
  /** True when Supabase env vars are present (sign-in UI is available). */
  available: boolean;
  /** False until the initial session load finishes. */
  ready: boolean;
}

const AccountContext = createContext<AuthContextValue>({ available: false, ready: true });

export function AccountProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!authEnabled);

  useEffect(() => {
    if (!authEnabled) return;
    let cancelled = false;

    void getSession().then((info) => {
      if (cancelled) return;
      applyAccount(info);
      setReady(true);
    });

    const unsubscribe = subscribeToAuth();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return (
    <AccountContext.Provider value={{ available: authEnabled, ready }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AuthContextValue {
  return useContext(AccountContext);
}
