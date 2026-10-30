import { behaviors, forces, falloff, modifiers } from '../../../../../src/index';
import { instrument, keepDistance } from './instruments';
import { altitude, avoid, damping, navigateTo, type Phase } from './phaseTypes';
import { CRUISE_ALTITUDE } from './world';

export type { HudEvent, HudTone, Phase, PhaseContext, PhaseScratch } from './phaseTypes';

/**
 * The mission, in order. Each phase demonstrates one idea, long enough to read, with one goal
 * force (drawn as an arrow) on top of altitude hold and damping. No noise anywhere: every change
 * of direction on screen is caused by a force you can see.
 */
export function createPhases(): Phase[] {
  return [
    {
      code: 'LAUNCH', title: 'Systems online', duration: 4, targetVisible: false, targetLocked: false, holding: true,
      enter: (ctx) => {
        ctx.emit({ text: 'SYSTEMS ONLINE', tone: 'info' });
        const [bx, by, bz] = ctx.world.base;
        const hover = [bx, by + CRUISE_ALTITUDE, bz];
        return [
          instrument('ASCEND', 'attract · falloff.arrive', 'goal', forces.attract(() => hover, falloff.arrive(7, 3))),
          damping(1.8),
        ];
      },
    },
    {
      code: 'NAVIGATE', title: 'Waypoint 1', duration: 7, targetVisible: false, targetLocked: false, waypoint: 'wp1',
      enter: (ctx) => {
        ctx.emit({ text: 'WAYPOINT 1 · NAVIGATING', tone: 'info' });
        return [navigateTo(ctx.world.waypoints[0].position), altitude(), damping()];
      },
    },
    {
      code: 'AVOID', title: 'Obstacle slalom', duration: 15, targetVisible: false, targetLocked: false, waypoint: 'wp2',
      enter: (ctx) => {
        ctx.emit({ text: 'OBSTACLES AHEAD', tone: 'warn' });
        return [navigateTo(ctx.world.waypoints[1].position, 6), avoid(ctx), altitude(), damping()];
      },
      update: (ctx, phaseTime) => {
        const close = ctx.scratch.nearest && ctx.scratch.nearest.distance < 4;
        if (close && phaseTime - ctx.scratch.lastReroute > 2.4) {
          ctx.scratch.lastReroute = phaseTime;
          ctx.emit({ text: 'REROUTING', tone: 'warn' });
        }
      },
    },
    {
      code: 'APPROACH', title: 'Waypoint 3', duration: 6, targetVisible: true, targetLocked: false, waypoint: 'wp3',
      enter: (ctx) => {
        ctx.emit({ text: 'CONTACT AHEAD', tone: 'info' });
        return [navigateTo(ctx.world.waypoints[2].position), altitude(), damping()];
      },
    },
    {
      code: 'PURSUE', title: 'Target acquired', duration: 12, targetVisible: true, targetLocked: true,
      enter: (ctx) => {
        ctx.emit({ text: 'TARGET ACQUIRED', tone: 'lock' });
        // `pursue` aims ahead of the target (lookahead on its velocity); `fadeIn` eases the turn in.
        return [
          instrument('PURSUE', 'behaviors.pursue · modifiers.fadeIn', 'goal', modifiers.fadeIn(1.5, behaviors.pursue(() => ctx.target, { strength: 8, slowR: 12, lookahead: 0.8, damp: 0 }))),
          instrument('KEEP DISTANCE', 'repel · falloff.within', 'hold', keepDistance(() => ctx.target.position, { near: 6, far: Infinity, strength: 16 })),
          altitude(),
          damping(),
        ];
      },
    },
    {
      code: 'ORBIT', title: 'Keep distance', duration: 10, targetVisible: true, targetLocked: true, holding: true,
      enter: (ctx) => {
        ctx.emit({ text: 'HOLDING 10M · ORBIT', tone: 'lock' });
        // The target has stopped: keep-distance holds the 9–11 m ring, tangentialAround circles it.
        return [
          instrument('KEEP DISTANCE', 'repel · within + attract · beyond', 'hold', keepDistance(() => ctx.target.position, { near: 9, far: 11, strength: 14 })),
          instrument('CIRCLE', 'forces.tangentialAround', 'goal', forces.tangentialAround([0, 1, 0], 3.5)),
          altitude(),
          damping(0.9),
        ];
      },
    },
    {
      code: 'RTB', title: 'Return to base', duration: 14, targetVisible: false, targetLocked: false,
      enter: (ctx) => {
        ctx.emit({ text: 'TARGET RELEASED · RTB', tone: 'info' });
        const [bx, by, bz] = ctx.world.base;
        return [navigateTo([bx, by + CRUISE_ALTITUDE, bz], 8), altitude(), damping()];
      },
    },
  ];
}
