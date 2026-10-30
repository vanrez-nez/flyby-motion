import * as THREE from 'three';
import { isDarkScheme, resolveCssColor as resolve } from '../../../../lib/cssColor';
import { DEFAULT_THEME } from '../../../../lib/theme/presets';

/**
 * Scene colors from the page theme: monochrome lines on the theme background (white on black in
 * dark mode, black on white in light mode), with the site accent kept for locks and warnings.
 */
export interface MissionPalette {
  dark: boolean;
  background: THREE.Color;
  line: THREE.Color;
  dim: THREE.Color;
  accent: THREE.Color;
  warn: THREE.Color;
  /** CSS strings, for canvas-drawn panels. */
  css: Record<'info' | 'lock' | 'warn', string>;
}

export function readPalette(element: HTMLElement): MissionPalette {
  const dark = isDarkScheme();
  const fallback = DEFAULT_THEME[dark ? 'dark' : 'light'];
  const background = resolve(element, '--tp-background', fallback.background);
  const foreground = resolve(element, '--tp-foreground', fallback.foreground);
  const accent = resolve(element, '--site-accent', fallback.accent);
  const warn = dark ? '#ff6b8b' : '#d6336c';
  const toColor = (css: string) => new THREE.Color().setStyle(css, THREE.SRGBColorSpace);
  const line = toColor(foreground);
  return {
    dark,
    background: toColor(background),
    line,
    dim: line.clone().lerp(toColor(background), 0.55),
    accent: toColor(accent),
    warn: toColor(warn),
    css: { info: foreground, lock: accent, warn },
  };
}
