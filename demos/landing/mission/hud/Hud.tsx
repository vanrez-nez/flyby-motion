import React, { useEffect, useRef } from 'react';
import type { HudAnchors, HudMessage, HudSnapshot } from '../hudState';
import { LockBrackets, Reticle } from './Reticle';
import './Hud.css';
import './HudEffects.css';

const pad = (value: number, size = 2) => String(Math.floor(value)).padStart(size, '0');

function missionClock(seconds: number): string {
  return `T+${pad(seconds / 60)}:${pad(seconds % 60)}`;
}

/**
 * The HUD over the scene. Panels re-render from the throttled snapshot; the reticle and lock
 * brackets follow the drone and target from `anchors` on their own animation frame, by transform
 * only, so following them costs no React renders and no layout.
 */
export const Hud: React.FC<{
  snapshot: HudSnapshot | null;
  messages: HudMessage[];
  anchors: HudAnchors;
}> = ({ snapshot, messages, anchors }) => {
  const reticleRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const reticle = reticleRef.current;
      const lock = lockRef.current;
      if (reticle) {
        reticle.style.transform = `translate3d(${anchors.drone.x}px, ${anchors.drone.y}px, 0)`;
        reticle.style.opacity = anchors.drone.visible ? '' : '0';
      }
      if (lock) {
        lock.style.transform = `translate3d(${anchors.target.x}px, ${anchors.target.y}px, 0)`;
        lock.dataset.visible = String(anchors.target.visible);
      }
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

      <div className="hud__reticle" ref={reticleRef}>
        <Reticle className="hud-reticle" />
      </div>

      <div className="hud__lock" ref={lockRef} data-locked={String(!!snapshot?.targetLocked)}>
        <LockBrackets className="hud-lock" />
        <span className="hud__lock-label">
          {snapshot?.targetLocked ? 'LOCK' : 'CONTACT'}
          {snapshot?.targetDistance != null && ` · ${snapshot.targetDistance.toFixed(0)}M`}
        </span>
      </div>

      {snapshot && (
        <section className="hud__panel hud__panel--forces" aria-label="Active forces">
          <h3 className="hud__heading">Active forces</h3>
          <ul className="hud__forces">
            {snapshot.forces.map((force) => (
              <li key={force.label} className="hud__force">
                <span className="hud__force-name">{force.label}</span>
                <span className="hud__force-bar"><span style={{ transform: `scaleX(${Math.max(0.02, force.level)})` }} /></span>
                <span className="hud__force-recipe">{force.recipe}</span>
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
            <div><dt>THR</dt><dd>{Math.round(snapshot.thrust * 100)}<small>%</small></dd></div>
            <div><dt>TGT</dt><dd>{snapshot.targetDistance == null ? '---' : snapshot.targetDistance.toFixed(0)}<small>m</small></dd></div>
            <div><dt>NAV</dt><dd>{snapshot.waypoint ?? '---'}</dd></div>
          </dl>
        </section>
      )}

      <div className="hud__ticker">
        {messages.slice(-3).map((message) => (
          <p key={message.id} className="hud__message" data-tone={message.tone}>
            <span className="hud__message-dot" />
            {message.text}
          </p>
        ))}
      </div>
    </div>
  );
};
