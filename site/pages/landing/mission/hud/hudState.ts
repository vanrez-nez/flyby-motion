import type { HudTone } from '../sim/missionScript';

/** What the HUD shows, published by the scene about 10 times a second. */
export interface HudForce {
  label: string;
  recipe: string;
  /** Matches the arrow color in the scene; `stabilize` forces are listed but not drawn. */
  kind: 'goal' | 'avoid' | 'hold' | 'stabilize';
  /** 0..1, relative to the drone's maxForce. */
  level: number;
}

export interface HudSnapshot {
  phaseIndex: number;
  phaseCount: number;
  phaseCode: string;
  phaseTitle: string;
  missionTime: number;
  forces: HudForce[];
  speed: number;
  altitude: number;
  heading: number;
  thrust: number;
  targetDistance: number | null;
  targetLocked: boolean;
  /** Holding a position or distance rather than carrying out an action: the reticle widens. */
  holding: boolean;
  waypoint: string | null;
}

export interface HudMessage {
  id: number;
  text: string;
  tone: HudTone;
  at: number;
}

/** Screen positions (px, relative to the scene box), written every frame without re-rendering React. */
export interface HudAnchors {
  drone: { x: number; y: number; visible: boolean };
  target: { x: number; y: number; visible: boolean };
  /** The camera's compass heading in degrees: 0 = north (−z), clockwise. Drives the compass ring. */
  heading: number;
}
