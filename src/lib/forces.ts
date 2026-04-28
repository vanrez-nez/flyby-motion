import * as Vector2Fn from './utils/Vector2Fn';
import * as Vector3Fn from './utils/Vector3Fn';
import { perlin1D } from './utils/perlin1D';
import { getVec } from './utils/vecDispatch';
import type { Force } from './Agent';

const DIST_EPSILON = 0.001;
const DRIFT_DEFAULT_STRENGTH = 50;
const DRIFT_DEFAULT_SCALE = 0.5;
const AXES = ['x', 'y', 'z'] as const;

export type AxisName = typeof AXES[number];

export type AxisConfig = {
  strength?: number;
  scale?: number;
  seed?: number;
};

export type AxisValue = true | false | AxisConfig;

export type DriftConfig = AxisConfig & {
  x?: AxisValue;
  y?: AxisValue;
  z?: AxisValue;
  noiseFn?: (x: number) => number;
};

type ResolvedDriftAxis = {
  index: number;
  strength: number;
  scale: number;
  seed: number;
};

function isAxisConfig(value: AxisValue | undefined): value is AxisConfig {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateStrength(value: number | undefined, label: string): void {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
    throw new RangeError(`${label} strength must be a finite non-negative number`);
  }
}

function validateScale(value: number | undefined, label: string): void {
  if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
    throw new RangeError(`${label} scale must be a finite positive number`);
  }
}

function validateSeed(value: number | undefined, label: string): void {
  if (value !== undefined && !Number.isFinite(value)) {
    throw new RangeError(`${label} seed must be a finite number`);
  }
}

function resolveDriftAxes(config: DriftConfig): ResolvedDriftAxis[] {
  const perAxisMode = AXES.some((axis) => {
    const value = config[axis];
    return value === true || isAxisConfig(value);
  });

  const axes: ResolvedDriftAxis[] = [];

  AXES.forEach((axis, index) => {
    const value = config[axis];
    const enabled = perAxisMode
      ? value === true || isAxisConfig(value)
      : value !== false;

    if (!enabled) return;

    const axisConfig = isAxisConfig(value) ? value : undefined;
    axes.push({
      index,
      strength: axisConfig?.strength ?? config.strength ?? DRIFT_DEFAULT_STRENGTH,
      scale: axisConfig?.scale ?? config.scale ?? DRIFT_DEFAULT_SCALE,
      seed: axisConfig?.seed ?? config.seed ?? index * 1000,
    });
  });

  return axes;
}

export function constant(vec: number[]): Force {
  return () => [...vec];
}

export function damp(coefficient: number): Force {
  return (agent) => {
    const dim = agent.velocity.length;
    const Fn = getVec(dim);
    const out = new Array<number>(dim).fill(0);
    return Fn.scale(out, agent.velocity, -coefficient);
  };
}

export function oscillate(
  direction: number[],
  amplitude: number,
  freq: number,
  phase = 0,
): Force {
  return (agent, _world, t) => {
    const dim = agent.position.length;
    const Fn = getVec(dim);
    const scalar = amplitude * Math.sin(2 * Math.PI * freq * t + phase);
    const out = new Array<number>(dim).fill(0);
    return Fn.scale(out, direction, scalar);
  };
}

export function drift(config: DriftConfig = {}): Force {
  validateStrength(config.strength, 'drift');
  validateScale(config.scale, 'drift');
  validateSeed(config.seed, 'drift');

  if (config.noiseFn !== undefined && typeof config.noiseFn !== 'function') {
    throw new TypeError('drift noiseFn must be a function');
  }

  for (const axis of AXES) {
    const value = config[axis];
    if (!isAxisConfig(value)) continue;
    validateStrength(value.strength, `drift.${axis}`);
    validateScale(value.scale, `drift.${axis}`);
    validateSeed(value.seed, `drift.${axis}`);
  }

  const axes = resolveDriftAxes(config);
  const noiseFn = config.noiseFn ?? perlin1D;

  return (agent, _world, t) => {
    const dim = agent.position.length;
    const out = new Array<number>(dim).fill(0);

    for (const axis of axes) {
      if (axis.index >= dim) continue;
      out[axis.index] = noiseFn(t * axis.scale + axis.seed) * axis.strength;
    }

    return out;
  };
}

export function attract(
  targetFn: () => number[],
  falloffFn?: (distance: number) => number,
): Force {
  return (agent) => {
    const target = targetFn();
    const dim = agent.position.length;
    const Fn = getVec(dim);
    const dir = new Array<number>(dim).fill(0);
    Fn.subtract(dir, target, agent.position);
    const dist = Fn.length(dir);
    if (dist <= DIST_EPSILON) return dir.fill(0);
    const magnitude = falloffFn ? falloffFn(dist) : dist;
    Fn.normalize(dir, dir);
    Fn.scale(dir, dir, magnitude);
    return dir;
  };
}

export function repel(
  sourceFn: () => number[],
  falloffFn?: (distance: number) => number,
): Force {
  return (agent) => {
    const source = sourceFn();
    const dim = agent.position.length;
    const Fn = getVec(dim);
    const dir = new Array<number>(dim).fill(0);
    Fn.subtract(dir, agent.position, source);
    const dist = Fn.length(dir);
    if (dist <= DIST_EPSILON) return dir.fill(0);
    const magnitude = falloffFn ? falloffFn(dist) : dist;
    Fn.normalize(dir, dir);
    Fn.scale(dir, dir, magnitude);
    return dir;
  };
}

/** 2D: force perpendicular to velocity (counter-clockwise). */
export function tangential(k: number): Force {
  return (agent) => {
    const v = agent.velocity;
    const speed = Vector2Fn.length(v);
    if (speed === 0) return [0, 0];
    return [(-v[1] / speed) * k, (v[0] / speed) * k];
  };
}

/** 3D: force perpendicular to velocity, in the plane defined by velocity × axis. */
export function tangentialAround(axis: number[], k: number): Force {
  return (agent) => {
    const v = agent.velocity;
    const out = [0, 0, 0];
    Vector3Fn.cross(out, v, axis);
    const len = Vector3Fn.length(out);
    if (len === 0) return out;
    Vector3Fn.normalize(out, out);
    Vector3Fn.scale(out, out, k);
    return out;
  };
}
