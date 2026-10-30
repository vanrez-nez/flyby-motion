import { behaviors, forces, type Agent } from '../../../../../src/index';
import { avoidObstacles, holdAltitude, instrument, type InstrumentedForce } from './instruments';
import { CRUISE_ALTITUDE, type Spire, type World } from './world';

export type HudTone = 'info' | 'lock' | 'warn';

export interface HudEvent {
  text: string;
  tone: HudTone;
}

/** Scratch state a phase can write during its run; reset when it starts. */
export interface PhaseScratch {
  nearest: { spire: Spire; distance: number } | null;
  lastReroute: number;
}

export interface PhaseContext {
  drone: Agent;
  target: Agent;
  world: World;
  scratch: PhaseScratch;
  emit: (event: HudEvent) => void;
}

export interface Phase {
  code: string;
  title: string;
  duration: number;
  targetVisible: boolean;
  targetLocked: boolean;
  /** The waypoint the phase flies to, highlighted in the scene and drawn as a goal line. */
  waypoint?: string;
  /** Returns the drone's forces for the phase; the HUD lists exactly these. */
  enter: (ctx: PhaseContext) => InstrumentedForce[];
  update?: (ctx: PhaseContext, phaseTime: number) => void;
}

/**
 * Shared building blocks. Every phase stacks a goal force on the two "background" ones: altitude
 * hold and damping. Those are listed but not drawn as arrows, so the arrows on screen are only the
 * forces that explain the motion.
 */
export const altitude = () =>
  instrument('ALTITUDE HOLD', 'attract · falloff.arrive', 'stabilize', holdAltitude(CRUISE_ALTITUDE));

export const damping = (coefficient = 1.2) =>
  instrument('DAMPING', 'forces.damp', 'stabilize', forces.damp(coefficient));

export const avoid = (ctx: PhaseContext) =>
  instrument('AVOID OBSTACLES', 'repel · falloff.within · spatial.Octree', 'avoid', avoidObstacles(ctx.world, {
    onNearest: (spire, distance) => {
      ctx.scratch.nearest = spire ? { spire, distance } : null;
    },
  }));

/** `behaviors.arrive` with gentle settings: cruise, then a long ease into the waypoint. */
export const navigateTo = (position: number[], strength = 7) =>
  instrument('NAVIGATE TO', 'behaviors.arrive', 'goal', behaviors.arrive(() => position, { strength, slowR: 14, damp: 0 }));
