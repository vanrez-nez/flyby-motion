import { falloff, forces, Vector3Fn, type Force } from '../../../src/index';
import { terrainHeight, type Spire, type World } from './world';

/**
 * Forces the drone flies on, each wrapped so the scene can show what is steering it.
 *
 * `instrument()` records a force's last output (direction and magnitude) without changing it:
 * the HUD lists the label and the scene draws it as an arrow on the drone, like the demos do.
 * The custom forces follow the tutorial's "Writing your own force" pattern.
 */

export type ForceKind = 'goal' | 'avoid' | 'hold' | 'stabilize';

export interface InstrumentedForce {
  force: Force;
  label: string;
  /** Library pieces the force is built from, shown under its label. */
  recipe: string;
  /** Picks the arrow color; `stabilize` (damping, altitude hold) is listed but not drawn. */
  kind: ForceKind;
  /** The last output vector. */
  vector: number[];
  magnitude: number;
}

export function instrument(label: string, recipe: string, kind: ForceKind, force: Force): InstrumentedForce {
  const record: InstrumentedForce = {
    label,
    recipe,
    kind,
    vector: [0, 0, 0],
    magnitude: 0,
    force: (agent, world, t, dt) => {
      const out = force(agent, world, t, dt);
      record.vector[0] = out[0];
      record.vector[1] = out[1];
      record.vector[2] = out[2];
      record.magnitude = Vector3Fn.length(out);
      return out;
    },
  };
  return record;
}

/**
 * Obstacle avoidance: repel from each spire within `range` (found through the world's Octree,
 * `spatial`), shaped by `falloff.within` + `falloff.linear` so it rises smoothly from zero at the
 * edge of the range; no spikes, so the swerve is one clean arc.
 *
 * A plain repel cancels a goal straight behind the obstacle, so the push is turned partly
 * sideways, on the side the drone already passes. The side is fixed per spire on first contact,
 * so the drone commits to one way round instead of wobbling.
 */
export function avoidObstacles(
  world: World,
  opts: { range?: number; strength?: number; onNearest?: (spire: Spire | null, distance: number) => void } = {},
): Force {
  const { range = 5, strength = 18, onNearest } = opts;
  const shape = falloff.within((gap) => strength * (1 - gap / range), range);
  const sides = new Map<Spire, number>();
  const axis = [0, 0, 0];
  return (agent) => {
    const [px, py, pz] = agent.position;
    const total = [0, 0, 0];
    let nearest: Spire | null = null;
    let nearestGap = Infinity;
    for (const spire of world.index.query(agent.position, range + 10)) {
      const [sx, sy, sz] = spire.position;
      if (py > sy + spire.height + 1) continue; // flying over it
      axis[0] = sx;
      axis[1] = py; // vertical spire: push only on the ground plane
      axis[2] = sz;
      const gap = Math.hypot(px - sx, pz - sz) - spire.radius;
      const away = forces.repel(() => axis, () => shape(Math.max(0, gap)))(agent, {}, 0, 0);
      if (away[0] === 0 && away[2] === 0) continue;
      let side = sides.get(spire);
      if (side === undefined) {
        // Pass on the side the drone is already offset to (or drifting to).
        const cross = (px - sx) * agent.velocity[2] - (pz - sz) * agent.velocity[0];
        side = cross >= 0 ? 1 : -1;
        sides.set(spire, side);
      }
      // Mostly sideways: the drone keeps its forward speed and slides around the pillar.
      total[0] += away[0] * 0.35 - away[2] * side;
      total[2] += away[2] * 0.35 + away[0] * side;
      if (gap < nearestGap) {
        nearestGap = gap;
        nearest = spire;
      }
    }
    onNearest?.(nearest, nearestGap);
    return total;
  };
}

/**
 * Altitude hold: `attract` towards cruise height straight below/above the drone, with
 * `falloff.arrive` so it eases in, plus vertical-only damping. The ground is flat under the route,
 * so this holds a steady line instead of chasing bumps.
 */
export function holdAltitude(altitude: number, strength = 6): Force {
  const target = [0, 0, 0];
  const settle = forces.attract(() => target, falloff.arrive(strength, 2));
  return (agent, world, t, dt) => {
    const [x, , z] = agent.position;
    target[0] = x;
    target[1] = terrainHeight(x, z) + altitude;
    target[2] = z;
    const out = settle(agent, world, t, dt);
    out[1] -= agent.velocity[1] * 2.2; // damp only the vertical motion
    return out;
  };
}

/**
 * Keep distance: a band around a moving point. Inside `near`, repel (`falloff.within`); beyond
 * `far`, attract (`falloff.beyond` + `falloff.arrive`, capped at `strength` however far the target
 * gets, so obstacle avoidance can still win); in between, nothing: the drone holds the ring.
 */
export function keepDistance(
  targetFn: () => number[],
  opts: { near: number; far: number; strength?: number },
): Force {
  const { near, far, strength = 14 } = opts;
  const push = forces.repel(targetFn, falloff.within((d) => strength * (1 - d / near) * 2, near));
  const pull = forces.attract(targetFn, falloff.beyond(falloff.arrive(strength, far + 8), far));
  return (agent, world, t, dt) => {
    const a = push(agent, world, t, dt);
    const b = pull(agent, world, t, dt);
    return [a[0] + b[0], 0, a[2] + b[2]];
  };
}
