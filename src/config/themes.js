/**
 * Centralized theme configuration – light themes with varied, colorful accents.
 * All components consume these tokens; no hardcoded colors.
 */

export const LIGHT_THEMES = [
  'light',         // Warm Sage – muted, default
  'light-ocean',
  'light-violet',
  'light-coral',
  'light-teal',
  'light-amber',
  'light-rose',
  'light-indigo',
];
export const THEMES = [...LIGHT_THEMES, 'dark'];

export const THEME_LABELS = {
  light: 'Warm Sage',
  'light-ocean': 'Ocean',
  'light-violet': 'Violet',
  'light-coral': 'Coral',
  'light-teal': 'Teal',
  'light-amber': 'Amber',
  'light-rose': 'Rose',
  'light-indigo': 'Indigo',
  dark: 'Dark',
};

/** [accent, sidebar BG] for swatch preview cards */
export const THEME_SWATCHES = {
  light: ['#8FAF9A', '#F1F4F1'],
  'light-ocean': ['#4A90D9', '#E8F2FA'],
  'light-violet': ['#7C6BB5', '#F3EFF9'],
  'light-coral': ['#D97B6B', '#FBF0ED'],
  'light-teal': ['#3A9B8E', '#E8F5F3'],
  'light-amber': ['#C9A227', '#FBF6E8'],
  'light-rose': ['#C97B8B', '#FBF0F2'],
  'light-indigo': ['#5B6BB8', '#EEF0F9'],
  dark: ['#2a2a2a', '#1a1a1a'],
};
