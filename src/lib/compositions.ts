import { attract, repel, damp as dampFn, tangential } from './primitives';
import { mag } from './magnitudes';
import { combined } from './combinators';
import { getVec } from './utils/vecDispatch';
import type { Contributor } from './Agent';

/**
 * Arrive: attract(targetFn, mag.arrive) + damp.
 * Agent slows as it approaches the target and stops inside slowR.
 */
export function arrive(
  targetFn: () => number[],
  opts: { k?: number; slowR?: number; damp?: number } = {},
): Contributor {
  const { k = 1, slowR = 100, damp = 1 } = opts;
  return combined(
    attract(targetFn, mag.arrive(k, slowR)),
    dampFn(damp),
  );
}

/**
 * Flee: repel(sourceFn) + damp.
 * Agent moves away from source with decaying speed.
 */
export function flee(
  sourceFn: () => number[],
  opts: { k?: number; damp?: number } = {},
): Contributor {
  const { k = 1, damp = 0.5 } = opts;
  return combined(
    repel(sourceFn, mag.constant(k)),
    dampFn(damp),
  );
}

/**
 * Orbit: attract(centerFn, mag.constant) + tangential + damp.
 * Agent circles the center. Works for 2D agents; for 3D use attract + tangentialAround.
 */
export function orbit(
  centerFn: () => number[],
  opts: { attractK?: number; tangentK?: number; damp?: number } = {},
): Contributor {
  const { attractK = 1, tangentK = 1, damp = 0 } = opts;
  return combined(
    attract(centerFn, mag.constant(attractK)),
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
  opts: { k?: number; slowR?: number; damp?: number; lookahead?: number } = {},
): Contributor {
  const { k = 5, slowR = 50, damp = 1, lookahead = 0.3 } = opts;
  const magFn = mag.arrive(k, slowR);

  const extrapolated = () => {
    const leader = leaderFn();
    const dim = leader.position.length;
    const Fn = getVec(dim);
    const ahead = [...leader.position];
    const tmp = new Array<number>(dim).fill(0);
    Fn.add(ahead, ahead, Fn.scale(tmp, leader.velocity, lookahead));
    return ahead;
  };

  return combined(
    attract(extrapolated, magFn),
    dampFn(damp),
  );
}
