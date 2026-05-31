import { Platform, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const colors = {
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  primaryFaded: '#DBEAFE',

  secondary: '#F59E0B',
  secondaryLight: '#FBBF24',
  secondaryDark: '#D97706',
  secondaryFaded: '#FEF3C7',

  accent: '#8B5CF6',
  accentLight: '#A78BFA',
  accentFaded: '#EDE9FE',

  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  card: '#FFFFFF',

  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',
  textLink: '#2563EB',

  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#E2E8F0',

  overlay: 'rgba(0, 0, 0, 0.5)',
  transparent: 'transparent',

  // Stats card colors
  statsGiven: '#10B981',
  statsReceived: '#3B82F6',
  statsReferralGiven: '#8B5CF6',
  statsReferralReceived: '#F59E0B',
} as const;

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  bodySemiBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmallMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  captionMedium: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  overline: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const;

export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
    },
    android: {
      elevation: 1,
    },
    web: {
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
    },
    android: {
      elevation: 3,
    },
    web: {
      boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
    },
    android: {
      elevation: 6,
    },
    web: {
      boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.1)',
    },
  }),
} as const;

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 900,
  xl: 1024,
} as const;

export const layout = {
  screenPadding: 20,
  webPadding: 28,
  cardPadding: 20,
  webCardPadding: 28,
  sectionGap: 28,
  maxContentWidth: 600,
  maxFormWidth: 560,
  isSmallScreen: SCREEN_WIDTH < 375,
  isTablet: SCREEN_WIDTH >= 768,

} as const;

const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  breakpoints,
  layout,
} as const;

export type Theme = typeof theme;
export default theme;
