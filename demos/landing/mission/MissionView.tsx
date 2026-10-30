import React, { useEffect, useRef, useState } from 'react';
import { createMissionScene, type MissionScene } from './missionScene';
import type { HudAnchors, HudMessage, HudSnapshot } from './hudState';
import { Hud } from './hud/Hud';
import { createGlitch } from './glitch';

const MAX_MESSAGES = 6;

/**
 * The landing's drone mission: the Three.js scene (its post pass fades the box into the page) and
 * the HUD over it. Disposes everything on unmount.
 */
export const MissionView: React.FC<{ className?: string }> = ({ className }) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const anchorsRef = useRef<HudAnchors>({
    drone: { x: 0, y: 0, visible: false },
    target: { x: 0, y: 0, visible: false },
    heading: 0,
  });
  const [snapshot, setSnapshot] = useState<HudSnapshot | null>(null);
  const [messages, setMessages] = useState<HudMessage[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = sceneRef.current;
    if (!container) return;
    const aborter = new AbortController();
    let scene: MissionScene | null = null;
    const glitch = createGlitch(
      (intensity, duration) => scene?.glitch(intensity, duration),
      () => container.parentElement?.querySelector<HTMLElement>('.hud') ?? null,
    );

    createMissionScene({
      container,
      anchors: anchorsRef.current,
      onSnapshot: setSnapshot,
      onMessage: (message) => {
        setMessages((list) => [...list.slice(-(MAX_MESSAGES - 1)), message]);
        glitch.event(message.tone);
      },
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
      glitch.dispose();
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
