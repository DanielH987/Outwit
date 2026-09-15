import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateId } from '@/utils/id';

interface AuthState {
  /** Active seat id, used by the server to bind a side. Equals `accountId`
   *  when signed in, otherwise the guest device/tab id. */
  userId: string;
  /** Guest seat id from identity resolution; restored on sign-out. */
  guestUserId: string;
  /** Supabase auth user id (`sub`) when signed in. */
  accountId: string | null;
  email: string | null;
  /** Cached access token for WebSocket auth (refreshed by the auth listener). */
  accessToken: string | null;
  username: string | null;
  isAuthenticated: boolean;
  /** Server-assigned id from the current connection (reassigned each reconnect). */
  connectionId: string | null;
  setUser: (userId: string, username: string) => void;
  /** Replace the seat identity (device-identity resolution, migration). */
  setUserId: (userId: string) => void;
  /** Set both the guest seat id and the active seat id (identity resolution). */
  setGuestUserId: (userId: string) => void;
  /** Switch to an authenticated identity; seat id becomes the account id. */
  setAccount: (accountId: string, email: string | null, accessToken: string | null) => void;
  /** Update just the cached token (refresh events). */
  setAccessToken: (token: string | null) => void;
  /** Return to the guest seat id. */
  clearAccount: () => void;
  setConnectionId: (id: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Guests get a generated identity immediately; `setUser` upgrades it.
      userId: generateId('user'),
      guestUserId: generateId('user'),
      accountId: null,
      email: null,
      accessToken: null,
      username: null,
      isAuthenticated: false,
      connectionId: null,
      setUser: (userId, username) =>
        set({ userId, username, isAuthenticated: true }),
      setUserId: (userId) => set({ userId }),
      setGuestUserId: (userId) => set((s) => ({ guestUserId: userId, userId: s.accountId ?? userId })),
      setAccount: (accountId, email, accessToken) =>
        set({ accountId, email, accessToken, userId: accountId, isAuthenticated: true }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clearAccount: () =>
        set((s) => ({ accountId: null, email: null, accessToken: null, userId: s.guestUserId, isAuthenticated: false })),
      setConnectionId: (id) => set({ connectionId: id }),
      logout: () =>
        set((s) => ({
          userId: s.guestUserId,
          accountId: null,
          email: null,
          accessToken: null,
          username: null,
          connectionId: null,
          isAuthenticated: false,
        })),
    }),
    {
      name: 'outwit-auth',
      storage: createJSONStorage(() => sessionStorage),
      version: 2,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<AuthState>;
        const guest = state.guestUserId ?? state.userId ?? generateId('user');
        return {
          ...state,
          guestUserId: guest,
          userId: version < 2 ? guest : state.userId ?? guest,
          accountId: state.accountId ?? null,
          email: state.email ?? null,
          accessToken: null,
          connectionId: null,
        } as AuthState;
      },
    }
  )
);
