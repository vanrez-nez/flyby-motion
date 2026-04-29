import * as PIXI from 'pixi.js';
import { useEffect, useState } from 'react';
import { demoColors } from '../2dHelpers';

export function usePixiDemo(playAreaRef: React.RefObject<HTMLDivElement | null>) {
  const [app, setApp] = useState<PIXI.Application | null>(null);

  useEffect(() => {
    const playArea = playAreaRef.current;
    if (!playArea) return;

    let isMounted = true;
    const newApp = new PIXI.Application();

    newApp.init({
      backgroundColor: demoColors.bg,
      antialias: true,
      width: playArea.clientWidth,
      height: playArea.clientHeight,
    }).then(() => {
      if (!isMounted) {
        newApp.destroy(true, { children: true, texture: true, baseTexture: true });
        return;
      }
      playArea.appendChild(newApp.canvas);
      setApp(newApp);
    });

    return () => {
      isMounted = false;
      try {
        if (newApp.canvas && newApp.canvas.parentNode) {
          newApp.canvas.parentNode.removeChild(newApp.canvas);
        }
      } catch (e) {
        // getter throws if renderer is not initialized
      }
      try {
        newApp.destroy(true, { children: true, texture: true, baseTexture: true });
      } catch (e) {
        // Ignore if already destroyed
      }
    };
  }, []);

  return app;
}
