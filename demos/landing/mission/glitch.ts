/**
 * Glitch effects for the mission box, played with the Web Animations API so they never re-render
 * React or touch the canvas:
 *
 * - `event`: on each mission message. The scene tears into horizontal slices that jump sideways
 *   for ~0.4 s, and the HUD text gets a brief red/cyan channel split (it doesn't move).
 * - `ambient`: a rarer, smaller tear of the scene alone, every 7–15 s, so the feed feels alive.
 *
 * Both are skipped when the user prefers reduced motion.
 */

type Tone = 'info' | 'lock' | 'warn';

const step = { easing: 'steps(1, end)' } as const;

/** Scene keyframes: each frame shows a different slice band, offset sideways. */
function tearFrames(intensity: number): Keyframe[] {
  const px = (n: number) => `${(n * intensity).toFixed(1)}px`;
  return [
    { ...step, transform: 'translateX(0)', clipPath: 'inset(0 0 0 0)', opacity: 1 },
    { ...step, transform: `translateX(${px(-9)})`, clipPath: 'inset(8% 0 62% 0)' },
    { ...step, transform: `translateX(${px(7)})`, clipPath: 'inset(44% 0 31% 0)' },
    { ...step, transform: 'translateX(0)', clipPath: 'inset(0 0 0 0)', opacity: 0.82 },
    { ...step, transform: `translateX(${px(-4)})`, clipPath: 'inset(71% 0 9% 0)' },
    { ...step, transform: `translateX(${px(11)})`, clipPath: 'inset(22% 0 55% 0)' },
    { ...step, transform: 'translateX(0)', clipPath: 'inset(0 0 0 0)', opacity: 1 },
  ];
}

const SPLIT: Record<Tone, string> = {
  info: '1.5px 0 rgba(255, 60, 120, 0.55), -1.5px 0 rgba(60, 200, 255, 0.55)',
  lock: '2px 0 rgba(139, 124, 255, 0.7), -2px 0 rgba(60, 200, 255, 0.6)',
  warn: '2.5px 0 rgba(255, 60, 110, 0.8), -2.5px 0 rgba(60, 200, 255, 0.6)',
};

export interface GlitchPlayer {
  event(tone: Tone): void;
  dispose(): void;
}

export function createGlitch(scene: HTMLElement, hud: () => HTMLElement | null): GlitchPlayer {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lastEvent = 0;
  let timer = 0;

  const tear = (intensity: number, duration: number) => {
    scene.animate(tearFrames(intensity), { duration, fill: 'none' });
  };

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
      tear(tone === 'warn' ? 1.3 : 1, tone === 'warn' ? 480 : 380);
      hud()?.animate(
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
