import { Pane } from 'tweakpane';
import { useEffect, useState } from 'react';

export function useTweakpane(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [pane, setPane] = useState<Pane | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // We create the Pane inside the effect so it runs in the client only. Narrow screens start it
    // folded: open, it would cover most of the canvas.
    const expanded = !window.matchMedia('(width < 48rem)').matches;
    const newPane = new Pane({ title: 'Settings', expanded, container });
    setPane(newPane);

    return () => {
      newPane.dispose();
    };
  }, []);

  return pane;
}
