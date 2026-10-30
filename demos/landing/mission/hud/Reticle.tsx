import React from 'react';

/**
 * The center reticle, after the HUD ring sheet: an outer ring of ticks, a broken middle ring
 * with four brackets, and an inner circle with a crosshair. Pure SVG, styled by `currentColor`.
 */
export const Reticle: React.FC<{ className?: string }> = ({ className }) => {
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const angle = (i / 72) * Math.PI * 2;
    const long = i % 6 === 0;
    const r1 = long ? 43 : 45;
    return (
      <line
        key={i}
        x1={50 + Math.cos(angle) * r1}
        y1={50 + Math.sin(angle) * r1}
        x2={50 + Math.cos(angle) * 47}
        y2={50 + Math.sin(angle) * 47}
        strokeWidth={long ? 0.6 : 0.3}
      />
    );
  });

  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" stroke="currentColor" aria-hidden="true">
      <g className="hud-reticle__ticks">{ticks}</g>
      <g className="hud-reticle__ring">
        <path d="M 50 14 A 36 36 0 0 1 82 34" strokeWidth="0.7" />
        <path d="M 86 50 A 36 36 0 0 1 66 82" strokeWidth="0.7" />
        <path d="M 50 86 A 36 36 0 0 1 18 66" strokeWidth="0.7" />
        <path d="M 14 50 A 36 36 0 0 1 34 18" strokeWidth="0.7" />
      </g>
      <g className="hud-reticle__brackets" strokeWidth="1.1">
        <path d="M 38 30 L 30 30 L 30 38" />
        <path d="M 62 30 L 70 30 L 70 38" />
        <path d="M 70 62 L 70 70 L 62 70" />
        <path d="M 30 62 L 30 70 L 38 70" />
      </g>
      <circle cx="50" cy="50" r="9" strokeWidth="0.6" />
      <path d="M 50 36 V 44 M 50 56 V 64 M 36 50 H 44 M 56 50 H 64" strokeWidth="0.6" />
      <circle cx="50" cy="50" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
};

/** Lock brackets around the target: four corners and a diamond, from the same sheet. */
export const LockBrackets: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" stroke="currentColor" aria-hidden="true">
    <g strokeWidth="2.2">
      <path d="M 8 30 V 8 H 30" />
      <path d="M 70 8 H 92 V 30" />
      <path d="M 92 70 V 92 H 70" />
      <path d="M 30 92 H 8 V 70" />
    </g>
    <path d="M 50 34 L 66 50 L 50 66 L 34 50 Z" strokeWidth="1" />
  </svg>
);
