/**
 * LoadKaro Auth Store (Zustand)
 * Manages user session, role-based routing, and auth tokens
 */

import { create } from 'zustand';
import type { User, UserRole } from '../lib/types';
import api from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  clearError: () => void;

  // Demo mode — for hackathon without backend auth
  loginAsDemo: (role: UserRole) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.login(email, password);
      api.setToken(response.token);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err.message || 'Login failed',
        isLoading: false,
      });
    }
  },

  signup: async (name, email, password, role) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.signup(name, email, password, role);
      api.setToken(response.token);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err.message || 'Signup failed',
        isLoading: false,
      });
    }
  },

  logout: () => {
    api.setToken(null);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  setUser: (user) => set({ user }),

  clearError: () => set({ error: null }),

  // Demo login for hackathon without a real auth backend
  loginAsDemo: (role: UserRole) => {
    const demoUser: User = {
      id: role === 'customer' ? 'demo-customer-001' : 'demo-driver-001',
      name: role === 'customer' ? 'Priya Sharma' : 'Raj Kumar',
      email: role === 'customer' ? 'priya@demo.com' : 'raj@demo.com',
      role,
      is_active: true,
    };
    set({
      user: demoUser,
      token: 'demo-token',
      isAuthenticated: true,
      error: null,
    });
  },
}));
