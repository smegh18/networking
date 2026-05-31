import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isNewUser: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  setNewUser: (isNewUser: boolean) => void;
  clearAuth: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isNewUser: false,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,

  setUser: (user) => {
    const isAuthenticated = !!user && user.profileComplete !== false;
    set({
      user,
      isAuthenticated,
      isLoading: false,
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setNewUser: (isNewUser) => set({ isNewUser }),

  clearAuth: () => set({ ...initialState, isLoading: false }),
}));
