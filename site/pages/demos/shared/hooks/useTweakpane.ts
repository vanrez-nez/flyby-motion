import { Pane } from 'tweakpane';
import { useEffect, useState } from 'react';

export function useTweakpane(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [pane, setPane] = useState<Pane | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // We create the Pane inside the effect so it runs in the client only
    const newPane = new Pane({ title: 'Settings', expanded: true, container });
    setPane(newPane);

    return () => {
      newPane.dispose();
    };
  }, []);

  return pane;
}
