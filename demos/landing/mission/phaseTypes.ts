import { behaviors, type Agent } from '../../../src/index';
import { avoidObstacles, instrument, terrainFollow, type InstrumentedForce } from './instruments';
import { CRUISE_ALTITUDE, type Spire, type World } from './world';

export type HudTone = 'info' | 'lock' | 'warn';

export interface HudEvent {
  text: string;
  tone: HudTone;
  /** Where the message also floats in the scene. */
  anchor: 'drone' | 'target' | 'base' | 'obstacle';
}

/** Scratch state a phase can write during its run; reset when it starts. */
export interface PhaseScratch {
  nearest: { spire: Spire; distance: number } | null;
  lastReroute: number;
  scanned: boolean;
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
  waypoint?: string;
  /** Returns the drone's forces for the phase; the HUD lists exactly these. */
  enter: (ctx: PhaseContext) => InstrumentedForce[];
  update?: (ctx: PhaseContext, phaseTime: number) => void;
}

/** Shared building blocks of the phases. */
export const terrain = (altitude = CRUISE_ALTITUDE) =>
  instrument('TERRAIN FOLLOW', 'attract · falloff.arrive', terrainFollow({ altitude }));

export const avoid = (ctx: PhaseContext, range?: number) =>
  instrument('AVOID OBSTACLES', 'repel · falloff.within · spatial.Octree', avoidObstacles(ctx.world, {
    range,
    onNearest: (spire, distance) => {
      ctx.scratch.nearest = spire ? { spire, distance } : null;
    },
  }));

export const navigateTo = (position: number[], strength = 9) =>
  instrument('NAVIGATE TO', 'behaviors.arrive', behaviors.arrive(() => position, { strength, slowR: 10, damp: 0.9 }));
