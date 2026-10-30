import React, { useEffect, useRef, useState } from 'react';
import { createMissionScene, type MissionScene } from './missionScene';
import type { HudAnchors, HudMessage, HudSnapshot } from './hudState';
import { Hud } from './hud/Hud';

const MAX_MESSAGES = 6;

/**
 * The landing's drone mission: the Three.js scene and the HUD over it, inside a vignette that
 * fades the box into the page. Disposes everything on unmount.
 */
export const MissionView: React.FC<{ className?: string }> = ({ className }) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const anchorsRef = useRef<HudAnchors>({
    drone: { x: 0, y: 0, visible: false },
    target: { x: 0, y: 0, visible: false },
  });
  const [snapshot, setSnapshot] = useState<HudSnapshot | null>(null);
  const [messages, setMessages] = useState<HudMessage[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = sceneRef.current;
    if (!container) return;
    const aborter = new AbortController();
    let scene: MissionScene | null = null;

    createMissionScene({
      container,
      anchors: anchorsRef.current,
      onSnapshot: setSnapshot,
      onMessage: (message) => setMessages((list) => [...list.slice(-(MAX_MESSAGES - 1)), message]),
    }, aborter.signal)
      .then((created) => {
        if (aborter.signal.aborted) created.dispose();
        else scene = created;
      })
      .catch((error: unknown) => {
        if ((error as DOMException)?.name === 'AbortError') return;
        // No WebGL: the hero still stands on its own.
        console.warn('[flyby] mission scene unavailable:', error);
        setFailed(true);
      });

    return () => {
      aborter.abort();
      scene?.dispose();
    };
  }, []);

  return (
    <div className={`mission ${className ?? ''}`} data-failed={failed || undefined}>
      <div className="mission__scene" ref={sceneRef} />
      {!failed && <Hud snapshot={snapshot} messages={messages} anchors={anchorsRef.current} />}
    </div>
  );
};
