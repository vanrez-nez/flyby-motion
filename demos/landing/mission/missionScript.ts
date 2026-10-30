import { Agent, falloff, forces, step, type Force } from '../../../src/index';
import type { InstrumentedForce } from './instruments';
import { createPhases, type HudEvent, type PhaseContext, type PhaseScratch } from './phases';
import { CRUISE_ALTITUDE, corridorX, terrainHeight, type Spire, type World } from './world';

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
 * The target vehicle. It loiters near WP 3 until the drone acquires it, then runs back along
 * the corridor (towards base) weaving left and right, so the drone tails it through the valley.
 * Moving = the lane point advances; loitering = it stays put and the target drifts around it.
 */
function addTargetForces(target: Agent, world: World, mode: () => 'loiter' | 'run' | 'escape'): void {
  const lane = [0, 0, 0];
  const loiter = world.waypoints[2].position;
  const updateLane: Force = (agent) => {
    const current = mode();
    // Slower than the drone (11) while it can be tailed; a burst of speed when it escapes.
    agent.maxSpeed = current === 'escape' ? 14 : 5.5;
    if (current === 'loiter') {
      lane[0] = loiter[0] + 4;
      lane[1] = loiter[1] - 1;
      lane[2] = loiter[2] - 6;
    } else if (current === 'run') {
      // Run back down the valley (+z), weaving across the corridor. It stops short of the obstacle
      // field, so the hold (keep distance) plays out in open ground beyond WP 2.
      const z = Math.min(agent.position[2] + 10, world.waypoints[1].position[2] - 8);
      lane[0] = corridorX(z) + Math.sin(z * 0.09) * 6;
      lane[1] = terrainHeight(lane[0], z) + CRUISE_ALTITUDE - 1;
      lane[2] = z;
    } else {
      // Escape: climb out over the eastern ridge, out of the drone's sight, so the search fails.
      const z = agent.position[2];
      lane[0] = corridorX(z) + 80;
      lane[1] = terrainHeight(lane[0], z) + 18;
      lane[2] = z - 30;
    }
    return [0, 0, 0];
  };
  target.add(updateLane, { label: 'lane' });
  // The lane pull is stronger while escaping, so the target clears the ridge quickly.
  const cruise = falloff.arrive(10, 4);
  const sprint = falloff.arrive(16, 4);
  target.add(forces.attract(() => lane, (d) => (mode() === 'escape' ? sprint(d) : cruise(d))), { label: 'follow lane' });
  target.add(forces.drift({ strength: 1.5, scale: 0.3, seed: 11 }), { label: 'drift' });
  target.add(forces.damp(0.9), { label: 'damp' });
}

export function createMission(world: World, onEvent: (event: HudEvent) => void): Mission {
  const pad = [world.base[0], world.base[1] + 1, world.base[2]];
  const targetStart = () => {
    const wp3 = world.waypoints[2].position;
    return [wp3[0] + 4, wp3[1] - 1, wp3[2] - 6];
  };

  const drone = new Agent({ position: [...pad], velocity: [0, 0, 0], maxSpeed: 11, maxForce: 40 });
  // Its speed limit changes with its mode (see addTargetForces).
  const target = new Agent({ position: targetStart(), velocity: [0, 0, 0], maxSpeed: 5.5, maxForce: 24 });

  const phases = createPhases();
  // The target loiters at WP 3, runs once acquired, and escapes over the ridge when the lock drops.
  const targetMode = (): 'loiter' | 'run' | 'escape' => {
    const code = phaseIndex >= 0 ? phases[phaseIndex].code : 'LAUNCH';
    if (code === 'ACQUIRE' || code === 'FOLLOW' || code === 'HOLD') return 'run';
    if (code === 'SEARCH' || code === 'RTB') return 'escape';
    return 'loiter';
  };
  addTargetForces(target, world, targetMode);
  const duration = phases.reduce((sum, phase) => sum + phase.duration, 0);
  const scratch: PhaseScratch = { nearest: null, lastReroute: -Infinity, scanned: false };
  const ctx: PhaseContext = { drone, target, world, scratch, emit: onEvent };

  let loopStart = 0;
  let phaseIndex = -1;
  let phaseStart = 0;
  let active: InstrumentedForce[] = [];

  const enterPhase = (index: number, t: number) => {
    phaseIndex = index;
    phaseStart = t;
    scratch.nearest = null;
    scratch.lastReroute = -Infinity;
    scratch.scanned = false;
    drone.clear();
    if (index === 0) {
      drone.position = [...pad];
      drone.velocity = [0, 0, 0];
      target.position = targetStart();
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
