import { attract, repel, damp as dampFn, tangential } from './forces';
import { falloff } from './falloff';
import { sum } from './modifiers';
import { getVec } from './utils/vecDispatch';
import type { Force } from './Agent';

/**
 * Arrive: attract(targetFn, falloff.arrive) + damp.
 * Agent slows as it approaches the target and stops inside slowR.
 */
export function arrive(
  targetFn: () => number[],
  opts: { strength?: number; slowR?: number; damp?: number } = {},
): Force {
  const { strength = 1, slowR = 100, damp = 1 } = opts;
  return sum(
    attract(targetFn, falloff.arrive(strength, slowR)),
    dampFn(damp),
  );
}

/**
 * Flee: repel(sourceFn) + damp.
 * Agent moves away from source with decaying speed.
 */
export function flee(
  sourceFn: () => number[],
  opts: { strength?: number; damp?: number } = {},
): Force {
  const { strength = 1, damp = 0.5 } = opts;
  return sum(
    repel(sourceFn, falloff.constant(strength)),
    dampFn(damp),
  );
}

/**
 * Orbit: attract(centerFn, falloff.constant) + tangential + damp.
 * Agent circles the center. Works for 2D agents; for 3D use attract + tangentialAround.
 */
export function orbit(
  centerFn: () => number[],
  opts: { attractK?: number; tangentK?: number; damp?: number } = {},
): Force {
  const { attractK = 1, tangentK = 1, damp = 0 } = opts;
  return sum(
    attract(centerFn, falloff.constant(attractK)),
    tangential(tangentK),
    dampFn(damp),
  );
}

/**
 * Pursue: attract toward leader's extrapolated future position + damp.
 * leaderFn must return { position, velocity } so lookahead can be applied.
 * Equivalent to: attract(() => position + velocity * lookahead) + damp.
 */
export function pursue(
  leaderFn: () => { position: number[]; velocity: number[] },
  opts: { strength?: number; slowR?: number; damp?: number; lookahead?: number } = {},
): Force {
  const { strength = 5, slowR = 50, damp = 1, lookahead = 0.3 } = opts;
  const falloffFn = falloff.arrive(strength, slowR);

  const extrapolated = () => {
    const leader = leaderFn();
    const dim = leader.position.length;
    const Fn = getVec(dim);
    const ahead = [...leader.position];
    const tmp = new Array<number>(dim).fill(0);
    Fn.add(ahead, ahead, Fn.scale(tmp, leader.velocity, lookahead));
    return ahead;
  };

  return sum(
    attract(extrapolated, falloffFn),
    dampFn(damp),
  );
}
