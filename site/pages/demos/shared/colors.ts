import { isDarkScheme, resolveCssColor } from '../../../lib/cssColor';

/**
 * The demo canvases' palette. One object that every 2D and 3D demo reads, updated in place from
 * the site theme (see `applyDemoTheme`), so the canvases share the page's background and accent in
 * both schemes.
 *
 * - From the theme: the background, the foreground (trails, outlines, the center marker), the
 *   grid (the background nudged toward the foreground) and the agents (the accent).
 * - Fixed hues, as the guides name them (yellow target, pink source, red force, blue velocity),
 *   each in a dark- and a light-scheme shade so they read on either background.
 */
export const demoColors = {
  bg: 0x06110c,
  trail: 0xdcf2e5,
  grid: 0x2f3f37,
  agent: 0x3ddc84,
  target: 0xffae3b,
  source: 0xff6b9a,
  force: 0xf15060,
  velocity: 0x4d9bff,
  radiusRing: 0xffc857,
};

export type DemoColorRole = keyof typeof demoColors;

const HUES: Record<'dark' | 'light', Pick<typeof demoColors, 'target' | 'source' | 'force' | 'velocity' | 'radiusRing'>> = {
  dark: { target: 0xffae3b, source: 0xff6b9a, force: 0xf15060, velocity: 0x4d9bff, radiusRing: 0xffc857 },
  light: { target: 0xc46a00, source: 0xc2185b, force: 0xcf2a43, velocity: 0x1d5fd6, radiusRing: 0xa8730f },
};

/** `rgb(…)` / `rgba(…)` as the browser computes it, to a 0xRRGGBB number. */
function toHex(css: string, fallback: number): number {
  const [r, g, b] = (css.match(/[\d.]+/g) ?? []).map(Number);
  if ([r, g, b].some((value) => Number.isNaN(value) || value === undefined)) return fallback;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

/** Channel-wise blend of two 0xRRGGBB colors: `amount` 0 is `a`, 1 is `b`. */
function mix(a: number, b: number, amount: number): number {
  const channel = (shift: number) => {
    const from = (a >> shift) & 0xff;
    const to = (b >> shift) & 0xff;
    return Math.round(from + (to - from) * amount) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

/** Reads the site theme into `demoColors`, in place. */
export function applyDemoTheme(element: HTMLElement): void {
  const background = toHex(resolveCssColor(element, '--tp-background', '#06110c'), demoColors.bg);
  const foreground = toHex(resolveCssColor(element, '--tp-foreground', '#dcf2e5'), demoColors.trail);
  Object.assign(demoColors, {
    bg: background,
    trail: foreground,
    grid: mix(background, foreground, 0.22),
    agent: toHex(resolveCssColor(element, '--site-accent', '#3ddc84'), demoColors.agent),
    ...HUES[isDarkScheme() ? 'dark' : 'light'],
  });
}
