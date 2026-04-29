export type FrameCallback = (elapsed: number, delta: number) => void;

export interface FrameOptions {
  /** Clamp the per-frame delta (in seconds) so long pauses don't produce huge steps. */
  maxDelta?: number;
  /** Start the loop immediately on creation. */
  autoStart?: boolean;
  /** Skip emitting the callback while the document is hidden. Does not affect start/stop. */
  visibleOnly?: boolean;
}

export interface FrameUpdater {
  start(): FrameUpdater;
  stop(): FrameUpdater;
  getElapsedTime(): number;
  getDelta(): number;
}

export function onFrame(callback: FrameCallback, options: FrameOptions = {}): FrameUpdater {
  const maxDelta = options.maxDelta ?? Infinity;
  const visibleOnly = options.visibleOnly ?? false;

  let oldTime = 0;
  let elapsedTime = 0;
  let lastDelta = 0;
  let running = false;
  let rafId = 0;

  function tick(): void {
    rafId = requestAnimationFrame(tick);
    const newTime = performance.now();
    lastDelta = Math.min((newTime - oldTime) / 1000, maxDelta);
    oldTime = newTime;
    elapsedTime += lastDelta;
    if (visibleOnly && typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    callback(elapsedTime, lastDelta);
  }

  const updater: FrameUpdater = {
    start() {
      if (running) return updater;
      oldTime = performance.now();
      elapsedTime = 0;
      lastDelta = 0;
      running = true;
      rafId = requestAnimationFrame(tick);
      return updater;
    },
    stop() {
      if (!running) return updater;
      running = false;
      cancelAnimationFrame(rafId);
      return updater;
    },
    getElapsedTime() {
      return elapsedTime;
    },
    getDelta() {
      return lastDelta;
    },
  };

  if (options.autoStart) updater.start();

  return updater;
}
