/**
 * Site themes. A theme is three base colors per scheme; styles/colors.css mixes every other role
 * (cards, borders, muted text, accent tints…) from them, so these six colors are the whole palette.
 *
 * The first preset is the default: its colors are the base tokens in colors.css (a test keeps the
 * two in step). The theme configurator (themeConfigurator.ts, dev only) switches between these and
 * edits them live.
 */

export interface SchemeColors {
  background: string;
  foreground: string;
  /** Links, the headline outline, the lock and trail in the scene, focus rings. */
  accent: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  light: SchemeColors;
  dark: SchemeColors;
}

export type Scheme = 'light' | 'dark';
export const SCHEMES: Scheme[] = ['light', 'dark'];
export const ROLES: Array<keyof SchemeColors> = ['background', 'foreground', 'accent'];

/** The CSS custom property holding one base color: `--theme-dark-accent`. */
export const themeVar = (scheme: Scheme, role: keyof SchemeColors) => `--theme-${scheme}-${role}`;

// Every pair clears WCAG AA: text ≥ 16:1, muted text ≥ 5.7:1, accent ≥ 4.6:1 on the background.
export const themePresets: ThemePreset[] = [
  {
    id: 'radar',
    name: 'Radar',
    // Phosphor green on a green-black scope.
    dark: { background: '#06110c', foreground: '#dcf2e5', accent: '#3ddc84' },
    light: { background: '#f3f8f5', foreground: '#0a1a11', accent: '#0f7a40' },
  },
  {
    id: 'night-flight',
    name: 'Night flight',
    // Slate-blue night sky with avionics amber, like a cockpit display after dark.
    dark: { background: '#0b1018', foreground: '#e6edf5', accent: '#ffb547' },
    light: { background: '#f4f6f9', foreground: '#0e1621', accent: '#a35f00' },
  },
  {
    id: 'stratosphere',
    name: 'Stratosphere',
    // Deep navy with high-altitude sky cyan.
    dark: { background: '#0a0f1f', foreground: '#e6ebff', accent: '#4cc9f0' },
    light: { background: '#f5f7fc', foreground: '#0b1430', accent: '#0a6f9e' },
  },
  {
    id: 'afterburner',
    name: 'Afterburner',
    // Warm black with a burnt-orange exhaust glow.
    dark: { background: '#120c0a', foreground: '#f6ece6', accent: '#ff6a3d' },
    light: { background: '#fbf7f4', foreground: '#1c110c', accent: '#c4401a' },
  },
  {
    id: 'signal',
    name: 'Signal',
    // Olive black with high-visibility chartreuse, like safety markings.
    dark: { background: '#0c0d0a', foreground: '#f1f2e8', accent: '#d4ff3a' },
    light: { background: '#f7f8f1', foreground: '#15170d', accent: '#5a7300' },
  },
];

export const DEFAULT_THEME = themePresets[0];
