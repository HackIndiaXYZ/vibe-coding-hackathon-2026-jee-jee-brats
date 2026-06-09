/**
 * LoadKaro Design System Constants
 * Dual-theme: Vibrant orange for customers, dark navy for drivers
 */

// ─── Customer Palette ───────────────────────────────────────────
export const CUSTOMER_COLORS = {
  primary: '#FF6B2C',
  primaryLight: '#FF8F5E',
  primaryDark: '#E55A1B',
  accent: '#FFB800',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  overlay: 'rgba(0, 0, 0, 0.45)',
} as const;

// ─── Driver Palette ─────────────────────────────────────────────
export const DRIVER_COLORS = {
  primary: '#2ECDF5',
  primaryLight: '#5ED8F7',
  primaryDark: '#1BA8CC',
  accent: '#7C3AED',
  background: '#0A1128',
  surface: '#1B2541',
  surfaceElevated: '#243056',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  overlay: 'rgba(10, 17, 40, 0.75)',
  radarPulse: 'rgba(46, 205, 245, 0.15)',
  radarRing: 'rgba(46, 205, 245, 0.3)',
  bidGlow: 'rgba(46, 205, 245, 0.4)',
} as const;

// ─── Shared Colors ──────────────────────────────────────────────
export const SHARED_COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  poolGreen: '#10B981',
  poolGreenLight: '#D1FAE5',
  soloBlue: '#3B82F6',
  soloBlueLight: '#DBEAFE',
  gradient: {
    customerStart: '#FF6B2C',
    customerEnd: '#FFB800',
    driverStart: '#0A1128',
    driverEnd: '#1B2541',
    authStart: '#FF6B2C',
    authMid: '#FF8F5E',
    authEnd: '#FFB800',
  },
} as const;

// ─── Typography ─────────────────────────────────────────────────
export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 30,
  '3xl': 36,
  '4xl': 48,
} as const;

export const FONT_WEIGHT = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

// ─── Spacing ────────────────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

// ─── Border Radius ──────────────────────────────────────────────
export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 9999,
} as const;

// ─── Shadows ────────────────────────────────────────────────────
export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  }),
} as const;

// ─── API Configuration ─────────────────────────────────────────
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80'; // Android emulator localhost via Nginx
export const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://10.0.2.2:80';
export const API_ENDPOINTS = {
  health: '/api/v1/health',
  nearbyDrivers: '/api/v1/drivers/nearby',
  cargoLaneMatch: '/api/v1/cargo-lanes/match',
  b2bBook: '/api/v1/b2b/book',
  createAuction: '/api/v1/advanced/auction/create',
  auctionState: (id: string) => `/api/v1/advanced/auction/${id}`,
  bookHelpers: '/api/v1/helpers/book',
} as const;
export const WS_ENDPOINTS = {
  loads: '/ws/loads',
  bids: '/ws/bids',
  auction: (id: string) => `/api/v1/advanced/ws/auction/${id}`,
} as const;

// ─── App Config ─────────────────────────────────────────────────
export const AUCTION_DURATION_SECONDS = 120;
export const SAHIYATRI_MATCH_TIMEOUT_MINUTES = 10;
export const SAHIYATRI_DISCOUNT_PERCENT = 40;
export const BID_STEP_AMOUNT = 50;
export const BID_MIN_AMOUNT = 100;
export const DEFAULT_SEARCH_RADIUS_KM = 5;
