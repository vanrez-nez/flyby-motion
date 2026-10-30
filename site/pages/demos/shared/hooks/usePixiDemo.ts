import * as PIXI from 'pixi.js';
import { useEffect, useState } from 'react';
import { waitForStableSize } from '../../../../lib/waitForStableSize';

export function usePixiDemo(playAreaRef: React.RefObject<HTMLDivElement | null>) {
  const [app, setApp] = useState<PIXI.Application | null>(null);

  useEffect(() => {
    const playArea = playAreaRef.current;
    if (!playArea) return;

    let isMounted = true;
    const aborter = new AbortController();
    const newApp = new PIXI.Application();

    // Create the renderer only once the play area has its final size, so the first frame (and the
    // scene laid out from `app.screen`) already uses it instead of a zero-width canvas.
    waitForStableSize(playArea, aborter.signal)
      .then(({ width, height }) => newApp.init({
        // Transparent: the play area's dotted grid shows through (demo2d.css).
        backgroundAlpha: 0,
        antialias: true,
        width,
        height,
      }))
      .then(() => {
        if (!isMounted) {
          newApp.destroy(true, { children: true, texture: true });
          return;
        }
        playArea.appendChild(newApp.canvas);
        setApp(newApp);
      })
      .catch((error: unknown) => {
        if ((error as DOMException)?.name !== 'AbortError') throw error;
      });

    return () => {
      isMounted = false;
      aborter.abort();
      try {
        if (newApp.canvas && newApp.canvas.parentNode) {
          newApp.canvas.parentNode.removeChild(newApp.canvas);
        }
      } catch (e) {
        // getter throws if renderer is not initialized
      }
      try {
        newApp.destroy(true, { children: true, texture: true });
      } catch (e) {
        // Ignore if already destroyed
      }
    };
  }, []);

  return app;
}
