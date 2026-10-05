import { useThemeStore } from '../store/themeStore';

export const useTheme = () => {
  const { isDarkMode, colors, toggleTheme, setTheme } = useThemeStore();

  return {
    isDarkMode,
    colors,
    toggleTheme,
    setTheme,
  };
};
