import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../theme';

interface ThemeState {
  isDarkMode: boolean;
  colors: typeof lightColors;
  toggleTheme: () => Promise<void>;
  setTheme: (isDark: boolean) => Promise<void>;
  initializeTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = '@para_app_theme_mode';

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDarkMode: false,
  colors: lightColors,

  toggleTheme: async () => {
    const nextMode = !get().isDarkMode;
    set({
      isDarkMode: nextMode,
      colors: nextMode ? darkColors : lightColors,
    });
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode ? 'dark' : 'light');
    } catch {}
  },

  setTheme: async (isDark: boolean) => {
    set({
      isDarkMode: isDark,
      colors: isDark ? darkColors : lightColors,
    });
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {}
  },

  initializeTheme: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'dark') {
        set({ isDarkMode: true, colors: darkColors });
      } else {
        set({ isDarkMode: false, colors: lightColors });
      }
    } catch {
      set({ isDarkMode: false, colors: lightColors });
    }
  },
}));
