import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  userId: string | null;
  username: string | null;
  isAuthenticated: boolean;
  setUser: (userId: string, username: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      username: null,
      isAuthenticated: false,
      setUser: (userId, username) =>
        set({ userId, username, isAuthenticated: true }),
      logout: () =>
        set({ userId: null, username: null, isAuthenticated: false }),
    }),
    { name: 'outwit-auth' }
  )
);
