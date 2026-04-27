import * as Vector2Fn from './utils/Vector2Fn';
import * as Vector3Fn from './utils/Vector3Fn';
import { getVec } from './utils/vecDispatch';
import type { Force } from './Agent';

const DIST_EPSILON = 0.001;

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
