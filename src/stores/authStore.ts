import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateId } from '@/utils/id';

interface AuthState {
  /** Stable client-generated identity; used as the server seat id so a
   *  reconnect re-binds to the same side. Stored per-tab in sessionStorage so
   *  two tabs of the same browser are two different players, while a refresh
   *  inside a tab keeps its seat. */
  userId: string;
  username: string | null;
  isAuthenticated: boolean;
  /** Server-assigned id from the current connection (reassigned each reconnect). */
  connectionId: string | null;
  setUser: (userId: string, username: string) => void;
  setConnectionId: (id: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Guests get a generated identity immediately; `setUser` upgrades it.
      userId: generateId('user'),
      username: null,
      isAuthenticated: false,
      connectionId: null,
      setUser: (userId, username) =>
        set({ userId, username, isAuthenticated: true }),
      setConnectionId: (id) => set({ connectionId: id }),
      logout: () =>
        set({
          userId: generateId('user'),
          username: null,
          connectionId: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'outwit-auth',
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<AuthState>;
        return {
          ...state,
          userId: state.userId ?? generateId('user'),
          connectionId: null,
        } as AuthState;
      },
    }
  )
);
