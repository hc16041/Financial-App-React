// Tokens de la identidad ledger-ink, espejo de apps/web/src/index.css.
// Sin hex nuevo: si un color no está acá, no se usa.
import { useColorScheme } from 'react-native';

export type Palette = {
  primary: string;
  primaryHover: string;
  accent: string;
  success: string;
  danger: string;
  info: string;
  bg: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  ink: string;
  textMuted: string;
};

const light: Palette = {
  primary: '#0f5132',
  primaryHover: '#0b3f27',
  accent: '#a86a2c',
  success: '#17704e',
  danger: '#b3402e',
  info: '#2f6f8f',
  bg: '#eef2ee',
  surface: '#ffffff',
  surfaceMuted: '#f4f7f4',
  border: '#dde5de',
  borderStrong: '#c6d2c8',
  ink: '#16211b',
  textMuted: '#5b6a61',
};

const dark: Palette = {
  primary: '#3fa874',
  primaryHover: '#4fbc86',
  accent: '#d1954f',
  success: '#3fa874',
  danger: '#e06a58',
  info: '#5aa0c4',
  bg: '#0e1512',
  surface: '#151f1b',
  surfaceMuted: '#1b2620',
  border: '#29352e',
  borderStrong: '#3a473f',
  ink: '#e8f0ea',
  textMuted: '#9aa8a0',
};

export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;
export const space = { 1: 4, 2: 8, 3: 16, 4: 24, 5: 32 } as const;

/** Cifras: monoespaciado con tabular-nums para que los montos se alineen. */
export const money = { fontVariant: ['tabular-nums'] as const };

export const useTheme = (): { c: Palette; isDark: boolean } => {
  const isDark = useColorScheme() === 'dark';
  return { c: isDark ? dark : light, isDark };
};
