import { create } from 'zustand';
import { DriverProfile, PassengerProfile, UserProfile, UserRole } from '../types';
import { getCurrentUserProfile, getStoredSessionUserId, signOut as apiSignOut } from '../api/auth';
import { supabase } from '../api/supabaseClient';

interface AuthState {
  user: UserProfile | null;
  passenger: PassengerProfile | null;
  driver: DriverProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: UserProfile | null) => void;
  setPassenger: (passenger: PassengerProfile | null) => void;
  setDriver: (driver: DriverProfile | null) => void;
  initializeAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  passenger: null,
  driver: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setPassenger: (passenger) => set({ passenger }),
  setDriver: (driver) => set({ driver }),

  initializeAuth: async () => {
    try {
      set({ isLoading: true, error: null });
      const storedUserId = await getStoredSessionUserId();

      if (storedUserId) {
        const { user, passenger, driver } = await getCurrentUserProfile(storedUserId);
        set({
          user,
          passenger: passenger || null,
          driver: driver || null,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          passenger: null,
          driver: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (err: any) {
      set({
        user: null,
        passenger: null,
        driver: null,
        isAuthenticated: false,
        isLoading: false,
        error: err.message || 'Auth initialization failed',
      });
    }
  },

  refreshProfile: async () => {
    const currentUserId = get().user?.user_id;
    if (!currentUserId) return;
    try {
      const { user, passenger, driver } = await getCurrentUserProfile(currentUserId);
      set({ user, passenger: passenger || null, driver: driver || null });
    } catch {
      // ignore transient refresh errors
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });
      await apiSignOut();
      set({
        user: null,
        passenger: null,
        driver: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
    }
  },
}));
