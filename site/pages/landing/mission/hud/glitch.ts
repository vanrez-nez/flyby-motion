/**
 * Glitch timing for the mission box:
 *
 * - `event`: on each mission message. The scene tears into horizontal slices that jump sideways
 *   for ~0.4 s (drawn by the scene's post pass), and the HUD text gets a brief red/cyan channel
 *   split. The side panels, out at the rim of the optic, tear with the scene: they jump sideways
 *   in steps. Played with the Web Animations API, so it never re-renders React.
 * - `ambient`: a rarer, smaller tear of the scene alone, every 7–15 s, so the feed feels alive.
 *
 * Both are skipped when the user prefers reduced motion.
 */

type Tone = 'info' | 'lock' | 'warn';

const step = { easing: 'steps(1, end)' } as const;

const SPLIT: Record<Tone, string> = {
  info: '1.5px 0 rgba(255, 60, 120, 0.55), -1.5px 0 rgba(60, 200, 255, 0.55)',
  lock: '2px 0 rgba(139, 124, 255, 0.7), -2px 0 rgba(60, 200, 255, 0.6)',
  warn: '2.5px 0 rgba(255, 60, 110, 0.8), -2.5px 0 rgba(60, 200, 255, 0.6)',
};

/** Side panel keyframes: stepped sideways jumps with the channels split, one frame showing a band. */
function panelTear(intensity: number, split: string): Keyframe[] {
  const px = (n: number) => `translateX(${(n * intensity).toFixed(1)}px)`;
  return [
    { ...step, transform: px(-6), clipPath: 'inset(0 0 0 0)', textShadow: split },
    { ...step, transform: px(4), clipPath: 'inset(30% 0 25% 0)', textShadow: split },
    { ...step, transform: px(0), clipPath: 'inset(0 0 0 0)', textShadow: split },
    { ...step, transform: px(8), clipPath: 'inset(0 0 0 0)', textShadow: split },
    { ...step, transform: px(0), clipPath: 'inset(0 0 0 0)' },
  ];
}

export interface GlitchPlayer {
  event(tone: Tone): void;
  dispose(): void;
}

/** `tear` draws a scene tear of the given intensity (~1) for `duration` ms. */
export function createGlitch(tear: (intensity: number, duration: number) => void, hud: () => HTMLElement | null): GlitchPlayer {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lastEvent = 0;
  let timer = 0;

  const scheduleAmbient = () => {
    timer = window.setTimeout(() => {
      // Skip if an event just played, or the box is hidden.
      if (!reduced.matches && performance.now() - lastEvent > 2500 && document.visibilityState === 'visible') {
        tear(0.5, 220);
      }
      scheduleAmbient();
    }, 7000 + Math.random() * 8000);
  };
  scheduleAmbient();

  return {
    event(tone) {
      if (reduced.matches) return;
      lastEvent = performance.now();
      const intensity = tone === 'warn' ? 1.3 : 1;
      const duration = tone === 'warn' ? 480 : 380;
      tear(intensity, duration);
      const root = hud();
      // The panels set their own (static fringe) text-shadow, so they get the split in their tear.
      root?.querySelectorAll<HTMLElement>('.hud__panel').forEach((panel) => {
        panel.animate(panelTear(intensity, SPLIT[tone]), { duration, fill: 'none' });
      });
      root?.animate(
        [
          { ...step, textShadow: SPLIT[tone] },
          { ...step, textShadow: 'none' },
          { ...step, textShadow: SPLIT[tone] },
          { ...step, textShadow: 'none' },
        ],
        { duration: 320, fill: 'none' },
      );
    },
    dispose() {
      window.clearTimeout(timer);
    },
  };
}
