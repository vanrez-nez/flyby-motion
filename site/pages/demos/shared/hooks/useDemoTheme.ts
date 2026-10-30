import { useEffect, useRef } from 'react';
import { applyDemoTheme } from '../colors';

/**
 * Keeps `demoColors` in step with the site theme: reads it on mount and whenever the theme changes
 * (the header switcher sets `data-theme` and the color scheme on <html>, the dev theme configurator
 * sets the base colors there, or the system scheme flips), then calls `onChange` so the scene can
 * recolor what it doesn't redraw every frame.
 */
export function useDemoTheme(onChange?: () => void): void {
  const callback = useRef(onChange);
  callback.current = onChange;

  useEffect(() => {
    const update = () => {
      applyDemoTheme(document.body);
      callback.current?.();
    };
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    system.addEventListener('change', update);
    return () => {
      observer.disconnect();
      system.removeEventListener('change', update);
    };
  }, []);
}
