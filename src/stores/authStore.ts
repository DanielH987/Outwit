import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  userId: string | null;
  username: string | null;
  isAuthenticated: boolean;
  /** Server-assigned id from the current connection; used to find your side. */
  connectionId: string | null;
  setUser: (userId: string, username: string) => void;
  setConnectionId: (id: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      username: null,
      isAuthenticated: false,
      connectionId: null,
      setUser: (userId, username) =>
        set({ userId, username, isAuthenticated: true }),
      setConnectionId: (id) => set({ connectionId: id }),
      logout: () =>
        set({ userId: null, username: null, connectionId: null, isAuthenticated: false }),
    }),
    { name: 'outwit-auth' }
  )
);
