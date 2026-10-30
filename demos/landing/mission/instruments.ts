import { falloff, forces, Vector3Fn, type Force } from '../../../src/index';
import { terrainHeight, type Spire, type World } from './world';

/**
 * Forces the drone flies on, each wrapped so the HUD can show what is steering it.
 *
 * `instrument()` records a force's magnitude every step without changing its output, and the
 * label is the one the HUD lists. The custom forces (avoidance, terrain follow, keep distance)
 * follow the tutorial's "Writing your own force" pattern: plain `(agent, world, t, dt) => vector`
 * functions composed from library forces and falloffs.
 */

export interface InstrumentedForce {
  force: Force;
  label: string;
  /** Library pieces the force is built from, shown under its label. */
  recipe: string;
  /** Magnitude of the last output. */
  magnitude: number;
}

export function instrument(label: string, recipe: string, force: Force): InstrumentedForce {
  const record: InstrumentedForce = {
    label,
    recipe,
    magnitude: 0,
    force: (agent, world, t, dt) => {
      const out = force(agent, world, t, dt);
      record.magnitude = Vector3Fn.length(out);
      return out;
    },
  };
  return record;
}

const ZERO = [0, 0, 0];

/**
 * Obstacle avoidance: repel from each spire within `range`, found through the world's Octree
 * (`spatial`), with `falloff.within` + `falloff.invSquare` so nearby spires dominate. Spires are
 * vertical, so distance is measured to the spire's axis at the drone's height.
 *
 * A plain repel cancels out a goal that is straight behind the obstacle and leaves the drone
 * stuck in front of it. So part of the push is turned sideways, around the spire, on the side the
 * drone is already moving towards: it flows around obstacles instead of stalling.
 */
export function avoidObstacles(
  world: World,
  opts: { range?: number; strength?: number; onNearest?: (spire: Spire | null, distance: number) => void } = {},
): Force {
  const { range = 9, strength = 420, onNearest } = opts;
  const shape = falloff.within(falloff.invSquare(strength, 1.2), range);
  const axis = [0, 0, 0];
  return (agent) => {
    const [px, py, pz] = agent.position;
    const nearby = world.index.query(agent.position, range + 14);
    const total = [0, 0, 0];
    let nearest: Spire | null = null;
    let nearestDistance = Infinity;
    for (const spire of nearby) {
      const [sx, sy, sz] = spire.position;
      if (py > sy + spire.height + 2) continue; // flying over it
      axis[0] = sx;
      axis[1] = Math.min(Math.max(py, sy), sy + spire.height);
      axis[2] = sz;
      // Distance is measured from the spire's surface, not its axis.
      const away = forces.repel(() => axis, (d) => shape(Math.max(0.05, d - spire.radius)))(agent, {}, 0, 0);
      // Sideways around the spire (perpendicular on the ground plane), towards the side the
      // drone is already drifting to, so it commits to one way round.
      let sideX = -away[2];
      let sideZ = away[0];
      if (sideX * agent.velocity[0] + sideZ * agent.velocity[2] < 0) {
        sideX = -sideX;
        sideZ = -sideZ;
      }
      total[0] += away[0] * 0.6 + sideX * 0.9;
      total[1] += away[1] * 0.3; // mostly steer around, not over
      total[2] += away[2] * 0.6 + sideZ * 0.9;
      const d = Math.hypot(px - sx, pz - sz) - spire.radius;
      if (d < nearestDistance) {
        nearestDistance = d;
        nearest = spire;
      }
    }
    onNearest?.(nearestDistance <= range ? nearest : null, nearestDistance);
    return total;
  };
}

/**
 * Terrain follow: hold `altitude` above the ground under the drone. Below it, a firm push up
 * (`falloff.linear`); above it, `attract` back down with `falloff.arrive` so it settles.
 */
export function terrainFollow(opts: { altitude: number; strength?: number }): Force {
  const { altitude, strength = 9 } = opts;
  const target = [0, 0, 0];
  const settle = forces.attract(() => target, falloff.arrive(strength * 2, 3));
  return (agent, world, t, dt) => {
    const [x, y, z] = agent.position;
    const floor = terrainHeight(x, z) + altitude;
    target[0] = x;
    target[1] = floor;
    target[2] = z;
    if (y < floor) return [0, (floor - y) * strength * 2, 0];
    return settle(agent, world, t, dt);
  };
}

/**
 * Keep distance: a band around a moving point. Inside `near`, repel (`falloff.within`); beyond
 * `far`, attract (`falloff.beyond` + `falloff.arrive`, which caps the pull at `strength` however far
 * the target gets, so obstacle avoidance can still win); in between, nothing: the drone holds the ring.
 */
export function keepDistance(
  targetFn: () => number[],
  opts: { near: number; far: number; strength?: number },
): Force {
  const { near, far, strength = 14 } = opts;
  const push = forces.repel(targetFn, falloff.within((d) => strength * (1 - d / near) * 2, near));
  const pull = forces.attract(targetFn, falloff.beyond(falloff.arrive(strength, far + 8), far));
  // Only pushes and pulls; settling inside the band comes from the phase's `forces.damp`.
  return (agent, world, t, dt) => {
    const a = push(agent, world, t, dt);
    const b = pull(agent, world, t, dt);
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  };
}

/** A force that outputs nothing; placeholder so a phase can list a passive entry. */
export const idle: Force = () => [...ZERO];
