import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const {
    user,
    passenger,
    driver,
    isAuthenticated,
    isLoading,
    error,
    initializeAuth,
    signOut,
    refreshProfile,
  } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return {
    user,
    passenger,
    driver,
    role: user?.role,
    isAuthenticated,
    isLoading,
    error,
    signOut,
    refreshProfile,
  };
}
