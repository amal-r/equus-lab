import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { palette, radius, spacing, ThemeMode } from './colors';

export function useTheme() {
  const mode: ThemeMode = useAppStore((s) => s.theme);
  const colors = useMemo(() => palette(mode), [mode]);
  return { mode, colors, radius, spacing, isDark: mode === 'dark' };
}
