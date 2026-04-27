import { constant, damp, oscillate, repel } from './forces';
import { falloff } from './falloff';
import { arrive as arriveBehavior } from './behaviors';
import { sum } from './modifiers';
import type { Force } from './Agent';

export function follow(
  targetFn: () => number[],
  opts: { strength?: number; ease?: number; damp?: number } = {},
): Force {
  const { strength = 800, ease = 120, damp = 2 } = opts;
  return arriveBehavior(targetFn, { strength, slowR: ease, damp });
}

export function snapTo(
  targetFn: () => number[],
  opts: { strength?: number; ease?: number; damp?: number } = {},
): Force {
  const { strength = 1500, ease = 60, damp = 5 } = opts;
  return arriveBehavior(targetFn, { strength, slowR: ease, damp });
}

export function flee(
  sourceFn: () => number[],
  opts: { strength?: number; range?: number; damp?: number } = {},
): Force {
  const { strength = 700, range = 200, damp = 1.5 } = opts;
  const fleeForce = repel(sourceFn, falloff.within(falloff.constant(strength), range));
  if (damp === 0) return fleeForce;
  return sum(fleeForce, dampForce(damp));
}

export function float(
  opts: { amplitude?: number; freq?: number; phase?: number } = {},
): Force {
  const { amplitude = 20, freq = 0.4, phase = 0 } = opts;
  return sum(
    oscillate([1, 0], amplitude, freq, phase),
    oscillate([0, 1], amplitude * 0.75, freq * 0.73, phase + Math.PI * 0.5),
  );
}

export function orbit(
  centerFn: () => number[],
  opts: {
    radius?: number;
    strength?: number;
    speed?: number;
    damp?: number;
    clockwise?: boolean;
  } = {},
): Force {
  const {
    radius = 100,
    strength = 12,
    speed = 180,
    damp = 2,
    clockwise = false,
  } = opts;

  const orbitForce: Force = (agent) => {
      const center = centerFn();
      let dx = agent.position[0] - center[0];
      let dy = agent.position[1] - center[1];
      let distance = Math.hypot(dx, dy);

      if (distance <= 0.001) {
        dx = 1;
        dy = 0;
        distance = 1;
      }

      const nx = dx / distance;
      const ny = dy / distance;
      const radialError = distance - radius;
      const direction = clockwise ? -1 : 1;
      const tangentX = -ny * direction;
      const tangentY = nx * direction;

      return [
        -nx * radialError * strength + tangentX * speed * damp,
        -ny * radialError * strength + tangentY * speed * damp,
      ];
    };

  if (damp === 0) return orbitForce;
  return sum(orbitForce, dampForce(damp));
}

export function repelFrom(
  sourceFn: () => number[],
  opts: { range?: number; strength?: number } = {},
): Force {
  const { range = 100, strength = 500 } = opts;
  return repel(sourceFn, falloff.within(falloff.constant(strength), range));
}

export function drift(
  opts: { direction?: number[]; speed?: number; damp?: number } = {},
): Force {
  const {
    direction = [1, 0],
    speed = 50,
    damp = 2,
  } = opts;
  const len = Math.hypot(...direction);
  const driftForce = direction.map((component) => {
    if (len === 0) return 0;
    return (component / len) * speed * damp;
  });

  if (damp === 0) return constant(driftForce);
  return sum(
    constant(driftForce),
    dampForce(damp),
  );
}

function dampForce(coefficient: number): Force {
  if (coefficient === 0) return constant([0, 0]);
  return damp(coefficient);
}
