import React, { useEffect, useRef } from 'react';
import type { HudAnchors, HudMessage, HudSnapshot } from '../hudState';
import { LockBrackets, Reticle } from './Reticle';
import './Hud.css';
import './HudEffects.css';

const pad = (value: number, size = 2) => String(Math.floor(value)).padStart(size, '0');

function missionClock(seconds: number): string {
  return `T+${pad(seconds / 60)}:${pad(seconds % 60)}`;
}

/** Force colors match the arrows in the scene. */
const KIND_LABEL: Record<string, string> = { goal: 'goal', avoid: 'avoid', hold: 'hold', stabilize: '' };

/**
 * The HUD over the scene. Everything with text stays fixed in place: the bar, the panels, the
 * ticker and the reticle (screen centre, where the chase camera keeps the drone). The only thing
 * that tracks the scene is the target lock bracket, smoothed so it glides instead of jittering.
 */
export const Hud: React.FC<{
  snapshot: HudSnapshot | null;
  messages: HudMessage[];
  anchors: HudAnchors;
}> = ({ snapshot, messages, anchors }) => {
  const lockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const shown = { x: 0, y: 0, ready: false };
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const lock = lockRef.current;
      if (!lock) return;
      const { x, y, visible } = anchors.target;
      if (!shown.ready || !visible) {
        shown.x = x;
        shown.y = y;
        shown.ready = visible;
      } else {
        // Critically damped-ish follow: the bracket glides after the target, never jitters.
        shown.x += (x - shown.x) * 0.18;
        shown.y += (y - shown.y) * 0.18;
      }
      lock.style.transform = `translate3d(${shown.x.toFixed(1)}px, ${shown.y.toFixed(1)}px, 0)`;
      lock.dataset.visible = String(visible);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [anchors]);

  const latest = messages[messages.length - 1];
  const tone = latest?.tone ?? 'info';

  return (
    <div className="hud" data-tone={tone} aria-hidden="true">
      {/* Re-keyed per message, so its one-shot glitch animation replays on each event. */}
      <div className="hud__scan" key={latest?.id ?? 0} />

      <div className="hud__bar">
        <span className="hud__chip hud__chip--strong">MISSION FLYBY-01</span>
        {snapshot && (
          <>
            <span className="hud__chip">PHASE {snapshot.phaseIndex + 1}/{snapshot.phaseCount}</span>
            <span className="hud__chip hud__chip--mode">{snapshot.phaseCode}</span>
            <span className="hud__chip hud__chip--clock">{missionClock(snapshot.missionTime)}</span>
          </>
        )}
      </div>

      <div className="hud__reticle">
        <Reticle className="hud-reticle" />
      </div>

      <div className="hud__lock" ref={lockRef} data-locked={String(!!snapshot?.targetLocked)}>
        <LockBrackets className="hud-lock" />
      </div>

      {snapshot && (
        <section className="hud__panel hud__panel--forces" aria-label="Active forces">
          <h3 className="hud__heading">Active forces</h3>
          <ul className="hud__forces">
            {snapshot.forces.map((force) => (
              <li key={force.label} className="hud__force" data-kind={force.kind}>
                <span className="hud__force-name">
                  <span className="hud__force-swatch" />
                  {force.label}
                </span>
                <span className="hud__force-bar"><span style={{ transform: `scaleX(${Math.max(0.02, force.level)})` }} /></span>
                <span className="hud__force-recipe">{force.recipe}{KIND_LABEL[force.kind] ? '' : ' · not drawn'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {snapshot && (
        <section className="hud__panel hud__panel--telemetry" aria-label="Telemetry">
          <h3 className="hud__heading">Telemetry</h3>
          <dl className="hud__readouts">
            <div><dt>SPD</dt><dd>{snapshot.speed.toFixed(1)}<small>m/s</small></dd></div>
            <div><dt>ALT</dt><dd>{snapshot.altitude.toFixed(1)}<small>m</small></dd></div>
            <div><dt>HDG</dt><dd>{pad(snapshot.heading, 3)}<small>°</small></dd></div>
            <div><dt>THR</dt><dd>{pad(snapshot.thrust * 100, 3)}<small>%</small></dd></div>
            <div><dt>TGT</dt><dd>{snapshot.targetDistance == null ? '---' : pad(snapshot.targetDistance, 3)}<small>m</small></dd></div>
            <div><dt>NAV</dt><dd>{snapshot.targetLocked ? 'TARGET' : snapshot.waypoint ?? '---'}</dd></div>
          </dl>
        </section>
      )}

      <div className="hud__ticker">
        {latest && (
          <p key={latest.id} className="hud__message" data-tone={latest.tone}>
            <span className="hud__message-dot" />
            {latest.text}
          </p>
        )}
      </div>
    </div>
  );
};
