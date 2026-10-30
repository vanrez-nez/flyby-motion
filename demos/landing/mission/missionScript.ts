import { Agent, falloff, forces, step, type Force } from '../../../src/index';
import type { InstrumentedForce } from './instruments';
import { createPhases, type HudEvent, type PhaseContext, type PhaseScratch } from './phases';
import { CRUISE_ALTITUDE, type Spire, type World } from './world';

export type { HudEvent, HudTone } from './phases';

/**
 * Runs the mission loop: picks the phase for the current time, swaps the drone's forces when it
 * changes, steps the drone and the target, and returns what the HUD shows.
 */

export interface MissionState {
  phaseIndex: number;
  phaseCount: number;
  phaseCode: string;
  phaseTitle: string;
  /** Seconds into the current loop. */
  missionTime: number;
  activeForces: InstrumentedForce[];
  targetLocked: boolean;
  targetVisible: boolean;
  waypoint: { label: string; position: number[] } | null;
  nearestObstacle: { spire: Spire; distance: number } | null;
}

export interface Mission {
  drone: Agent;
  target: Agent;
  world: World;
  /** Loop length in seconds. */
  duration: number;
  update(t: number, dt: number): MissionState;
  dispose(): void;
}

/**
 * The target: waits at its start point, then, once acquired, flies a straight line back along the
 * return lane (parallel to the route, clear of the slalom) and stops, so the drone can orbit it.
 * Straight and steady on purpose: the drone's pursuit is what the scene is showing.
 */
function addTargetForces(target: Agent, world: World, moving: () => boolean): void {
  const [sx, sy, sz] = world.targetStart;
  const stop = [world.returnLaneX, sy, -50];
  const goal = [sx, sy, sz];
  const pickGoal: Force = () => {
    const destination = moving() ? stop : world.targetStart;
    goal[0] = destination[0];
    goal[1] = destination[1];
    goal[2] = destination[2];
    return [0, 0, 0];
  };
  target.add(pickGoal, { label: 'goal' });
  target.add(forces.attract(() => goal, falloff.arrive(6, 10)), { label: 'run' });
  target.add(forces.damp(1.1), { label: 'damp' });
}

export function createMission(world: World, onEvent: (event: HudEvent) => void): Mission {
  const pad = [world.base[0], world.base[1] + 0.6, world.base[2]];
  const drone = new Agent({ position: [...pad], velocity: [0, 0, 0], maxSpeed: 9, maxForce: 24 });
  const target = new Agent({ position: [...world.targetStart], velocity: [0, 0, 0], maxSpeed: 5, maxForce: 12 });

  const phases = createPhases();
  const duration = phases.reduce((sum, phase) => sum + phase.duration, 0);
  const scratch: PhaseScratch = { nearest: null, lastReroute: -Infinity };
  const ctx: PhaseContext = { drone, target, world, scratch, emit: onEvent };

  let loopStart = 0;
  let phaseIndex = -1;
  let phaseStart = 0;
  let active: InstrumentedForce[] = [];

  // The target runs while it is pursued, then holds where it stopped (orbit) until the loop ends.
  addTargetForces(target, world, () => phaseIndex >= 0 && ['PURSUE', 'ORBIT', 'RTB'].includes(phases[phaseIndex].code));

  const enterPhase = (index: number, t: number) => {
    phaseIndex = index;
    phaseStart = t;
    scratch.nearest = null;
    scratch.lastReroute = -Infinity;
    drone.clear();
    if (index === 0) {
      drone.position = [...pad];
      drone.velocity = [0, 0, 0];
      target.position = [...world.targetStart];
      target.velocity = [0, 0, 0];
    }
    active = phases[index].enter(ctx);
    active.forEach((entry) => drone.add(entry.force, { label: entry.label }));
  };

  const phaseAt = (missionTime: number): number => {
    let elapsed = 0;
    for (let i = 0; i < phases.length; i++) {
      elapsed += phases[i].duration;
      if (missionTime < elapsed) return i;
    }
    return phases.length;
  };

  return {
    drone,
    target,
    world,
    duration,
    update(t, dt) {
      let index = phaseAt(t - loopStart);
      if (index >= phases.length) {
        loopStart = t;
        index = 0;
      }
      if (index !== phaseIndex) enterPhase(index, t);

      const phase = phases[phaseIndex];
      phase.update?.(ctx, t - phaseStart);
      step(target, {}, t, dt);
      step(drone, {}, t, dt);

      const wp = phase.waypoint ? world.waypoints.find((w) => w.id === phase.waypoint) ?? null : null;
      return {
        phaseIndex,
        phaseCount: phases.length,
        phaseCode: phase.code,
        phaseTitle: phase.title,
        missionTime: t - loopStart,
        activeForces: active,
        targetLocked: phase.targetLocked,
        targetVisible: phase.targetVisible,
        waypoint: wp ? { label: wp.label, position: wp.position } : null,
        nearestObstacle: scratch.nearest,
      };
    },
    dispose() {
      drone.clear();
      target.clear();
    },
  };
}

export { CRUISE_ALTITUDE };
