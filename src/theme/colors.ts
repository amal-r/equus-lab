// Paleta calcada de Equus Lab.dc.html (--bg, --surface, --nav, --tint, --ph, --chip, --ink, --m*)
// Un solo acento de marca (terracota) + un verde secundario que el prototipo usa para "positivo".

export type ThemeMode = 'light' | 'dark';

export interface EquusColors {
  bg: string;
  surface: string;
  nav: string;
  tint: string;
  ph: string; // placeholder (miniaturas de vídeo, avatares)
  chip: string;
  ink: string;
  m30: string;
  m40: string;
  m45: string;
  m50: string;
  m55: string;
  m60: string;
  accent: string;
  accentDark: string;
  good: string; // verde "bien hecho" (#5a7048)
  warn: string; // ámbar cuota
  danger: string; // rojo eliminar/cancelar
  border: string;
}

export const ACCENT = '#c05f3a';
const ACCENT_DARK = '#a44d2c';
const GOOD = '#5a7048';
const WARN = '#e0a04a';
const DANGER = '#c0473a';

export const light: EquusColors = {
  bg: '#faf7f2',
  surface: '#ffffff',
  nav: '#f1ebe3',
  tint: '#eef1ea',
  ph: '#ecdfd3',
  chip: '#f5e7de',
  ink: '#26221d',
  m30: 'rgba(0,0,0,0.30)',
  m40: 'rgba(0,0,0,0.40)',
  m45: 'rgba(0,0,0,0.45)',
  m50: 'rgba(0,0,0,0.50)',
  m55: 'rgba(0,0,0,0.55)',
  m60: 'rgba(0,0,0,0.60)',
  accent: ACCENT,
  accentDark: ACCENT_DARK,
  good: GOOD,
  warn: WARN,
  danger: DANGER,
  border: 'rgba(0,0,0,0.08)',
};

export const dark: EquusColors = {
  bg: '#17130f',
  surface: '#241f18',
  nav: '#1e1913',
  tint: '#25301e',
  ph: '#3a332b',
  chip: '#3a2c22',
  ink: '#f2ede6',
  m30: 'rgba(242,237,230,0.35)',
  m40: 'rgba(242,237,230,0.46)',
  m45: 'rgba(242,237,230,0.52)',
  m50: 'rgba(242,237,230,0.58)',
  m55: 'rgba(242,237,230,0.64)',
  m60: 'rgba(242,237,230,0.70)',
  accent: ACCENT,
  accentDark: ACCENT_DARK,
  good: GOOD,
  warn: WARN,
  danger: DANGER,
  border: 'rgba(255,255,255,0.10)',
};

export function palette(mode: ThemeMode): EquusColors {
  return mode === 'dark' ? dark : light;
}

export const radius = { sm: 12, md: 14, lg: 16, xl: 18, xxl: 22, pill: 20, round: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 28 };
