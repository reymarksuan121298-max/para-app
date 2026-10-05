// PARA App Brand Color Palette aligned with Golden Yellow & Cyan Logo (#0284C7 / #F59E0B / #0F172A)

export const lightColors = {
  // Brand (PARA Logo Cyan & Gold)
  primary: '#0284C7', // Sky Cyan 600
  primaryDark: '#0369A1', // Sky Cyan 700
  primaryLight: '#38BDF8', // Sky Cyan 400
  primarySubtle: '#F0F9FF', // Sky 50

  // Secondary / Tricycle Accent
  secondary: '#F59E0B', // Golden Amber
  secondaryDark: '#D97706',
  secondaryLight: '#FEF3C7',

  // Status colors
  success: '#10B981',
  successBg: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  info: '#0284C7',
  infoBg: '#F0F9FF',

  // Neutrals
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',

  // Dark/Overlay
  overlay: 'rgba(15, 23, 42, 0.6)',
  white: '#FFFFFF',
  black: '#000000',
  isDark: false,
};

export const darkColors = {
  // Brand (PARA Logo Cyan & Gold)
  primary: '#38BDF8', // Glowing Cyan in dark mode
  primaryDark: '#0284C7',
  primaryLight: '#7DD3FC',
  primarySubtle: '#082F49',

  // Secondary / Tricycle Accent
  secondary: '#FBBF24', // Bright Gold Accent
  secondaryDark: '#F59E0B',
  secondaryLight: '#78350F',

  // Status colors
  success: '#34D399',
  successBg: '#064E3B',
  warning: '#FBBF24',
  warningBg: '#78350F',
  danger: '#F87171',
  dangerBg: '#7F1D1D',
  info: '#38BDF8',
  infoBg: '#082F49',

  // Neutrals
  background: '#0B1120', // Deep Navy Void
  surface: '#0F172A', // Slate 900
  card: '#1E293B', // Slate 800
  textPrimary: '#F8FAFC', // Slate 50
  textSecondary: '#94A3B8', // Slate 400
  textMuted: '#64748B', // Slate 500
  border: '#1E293B',
  borderSubtle: '#334155',

  // Dark/Overlay
  overlay: 'rgba(0, 0, 0, 0.8)',
  white: '#FFFFFF',
  black: '#000000',
  isDark: true,
};

export let colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  heading1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  heading2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  heading3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  subtitle: { fontSize: 16, fontWeight: '500' as const, lineHeight: 22 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodyBold: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  captionBold: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
};

export default {
  colors,
  lightColors,
  darkColors,
  spacing,
  borderRadius,
  typography,
};
