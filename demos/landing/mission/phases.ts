import { behaviors, forces, falloff, modifiers } from '../../../src/index';
import { instrument, keepDistance } from './instruments';
import { avoid, navigateTo, terrain, type Phase } from './phaseTypes';
import { CRUISE_ALTITUDE } from './world';

export type { HudEvent, HudTone, Phase, PhaseContext, PhaseScratch } from './phaseTypes';

/** The mission, in order. Each phase lists the library forces that fly it. */
export function createPhases(): Phase[] {
  return [
    {
      code: 'LAUNCH', title: 'Systems online', duration: 4, targetVisible: false, targetLocked: false,
      enter: (ctx) => {
        ctx.emit({ text: 'SYSTEMS ONLINE', tone: 'info', anchor: 'base' });
        const [bx, by, bz] = ctx.world.base;
        const lift = [bx, by + CRUISE_ALTITUDE, bz - 4];
        return [
          instrument('ASCEND', 'attract · falloff.arrive', forces.attract(() => lift, falloff.arrive(8, 4))),
          instrument('HOVER', 'forces.oscillate', forces.oscillate([0, 1, 0], 1.2, 0.6)),
          instrument('STABILIZE', 'forces.damp', forces.damp(1.6)),
        ];
      },
    },
    {
      code: 'NAV', title: 'Waypoint 1', duration: 9, targetVisible: false, targetLocked: false, waypoint: 'wp1',
      enter: (ctx) => {
        ctx.emit({ text: 'WAYPOINT 1 · NAVIGATING', tone: 'info', anchor: 'drone' });
        return [navigateTo(ctx.world.waypoints[0].position), terrain()];
      },
    },
    {
      code: 'AVOID', title: 'Obstacle field', duration: 14, targetVisible: false, targetLocked: false, waypoint: 'wp2',
      enter: (ctx) => {
        ctx.emit({ text: 'OBSTACLE FIELD AHEAD', tone: 'warn', anchor: 'obstacle' });
        return [navigateTo(ctx.world.waypoints[1].position, 11), avoid(ctx), terrain()];
      },
      update: (ctx, phaseTime) => {
        const close = ctx.scratch.nearest && ctx.scratch.nearest.distance < 4.5;
        if (close && phaseTime - ctx.scratch.lastReroute > 2.2) {
          ctx.scratch.lastReroute = phaseTime;
          ctx.emit({ text: 'REROUTING', tone: 'warn', anchor: 'drone' });
        }
      },
    },
    {
      code: 'SCOUT', title: 'Waypoint 3', duration: 6, targetVisible: true, targetLocked: false, waypoint: 'wp3',
      enter: (ctx) => {
        ctx.emit({ text: 'CONTACT · WAYPOINT 3', tone: 'info', anchor: 'target' });
        return [navigateTo(ctx.world.waypoints[2].position, 11), avoid(ctx, 6), terrain()];
      },
    },
    {
      code: 'ACQUIRE', title: 'Target acquired', duration: 4, targetVisible: true, targetLocked: true,
      enter: (ctx) => {
        ctx.emit({ text: 'TARGET ACQUIRED', tone: 'lock', anchor: 'target' });
        return [
          instrument('INTERCEPT', 'modifiers.fadeIn · behaviors.pursue', modifiers.fadeIn(
            2.5,
            behaviors.pursue(() => ctx.target, { strength: 10, slowR: 8, lookahead: 0.6 }),
          )),
          terrain(),
        ];
      },
    },
    {
      code: 'FOLLOW', title: 'Tracking', duration: 10, targetVisible: true, targetLocked: true,
      enter: (ctx) => {
        ctx.emit({ text: 'TRACKING', tone: 'lock', anchor: 'target' });
        // Pursue with a negative lookahead: aim at where the target was half a second ago, so the
        // drone trails it instead of sitting on top of it; `keepDistance` stops it closing in.
        return [
          instrument('FOLLOW', 'behaviors.pursue', behaviors.pursue(() => ctx.target, { strength: 11, slowR: 6, lookahead: -0.6, damp: 1 })),
          instrument('KEEP DISTANCE', 'repel · falloff.within', keepDistance(() => ctx.target.position, { near: 5, far: Infinity, strength: 20 })),
          avoid(ctx, 6),
          terrain(CRUISE_ALTITUDE - 1),
        ];
      },
    },
    {
      code: 'HOLD', title: 'Keep distance', duration: 9, targetVisible: true, targetLocked: true,
      enter: (ctx) => {
        ctx.emit({ text: 'HOLDING 10M', tone: 'lock', anchor: 'target' });
        // Shadow the moving target from 8–12 m: keep-distance holds the band, `pursue` with a
        // weak pull matches its velocity, `tangentialAround` slides the drone around it.
        return [
          instrument('KEEP DISTANCE', 'repel · within + attract · beyond', keepDistance(() => ctx.target.position, { near: 8, far: 12, strength: 18 })),
          instrument('MATCH VELOCITY', 'behaviors.pursue', behaviors.pursue(() => ctx.target, { strength: 4, slowR: 30, lookahead: 1.5, damp: 0 })),
          instrument('CIRCLE', 'forces.tangentialAround', forces.tangentialAround([0, 1, 0], 3)),
          avoid(ctx, 6),
          terrain(),
          instrument('STABILIZE', 'forces.damp', forces.damp(0.9)),
        ];
      },
    },
    {
      code: 'SEARCH', title: 'Target lost', duration: 8, targetVisible: false, targetLocked: false,
      enter: (ctx) => {
        ctx.emit({ text: 'TARGET LOST', tone: 'warn', anchor: 'drone' });
        const lastSeen = [...ctx.target.position];
        return [
          instrument('SEARCH PATTERN', 'attract + forces.tangentialAround', modifiers.sum(
            forces.attract(() => lastSeen, falloff.constant(5)),
            forces.tangentialAround([0, 1, 0], 7),
          )),
          instrument('SCAN DRIFT', 'forces.drift', forces.drift({ strength: 2, scale: 0.4, seed: 3 })),
          terrain(CRUISE_ALTITUDE + 2),
          instrument('STABILIZE', 'forces.damp', forces.damp(0.7)),
        ];
      },
      update: (ctx, phaseTime) => {
        if (phaseTime > 4 && !ctx.scratch.scanned) {
          ctx.scratch.scanned = true;
          ctx.emit({ text: 'SCANNING · NO CONTACT', tone: 'warn', anchor: 'drone' });
        }
      },
    },
    {
      code: 'RTB', title: 'Return to base', duration: 14, targetVisible: false, targetLocked: false,
      enter: (ctx) => {
        ctx.emit({ text: 'RETURN TO BASE', tone: 'info', anchor: 'base' });
        const [bx, by, bz] = ctx.world.base;
        return [navigateTo([bx, by + CRUISE_ALTITUDE, bz - 4], 10), avoid(ctx), terrain()];
      },
    },
  ];
}
