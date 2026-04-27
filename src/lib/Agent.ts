import { EventEmitter } from './utils/EventEmitter';

export type World = Record<string, unknown>;
export type Force = (agent: Agent, world: World, t: number, dt: number) => number[];

export interface AgentOptions {
  position?: number[];
  velocity?: number[];
  mass?: number;
  maxSpeed?: number;
  maxForce?: number;
}

const metaMap = new WeakMap<Force, { label?: string }>();

export class Agent extends EventEmitter {
  position: number[];
  velocity: number[];
  mass: number;
  maxSpeed: number;
  maxForce: number;
  forces: Set<Force>;

  constructor(opts: AgentOptions = {}) {
    super();
    const dim = opts.position?.length ?? 2;
    this.position = opts.position ?? new Array(dim).fill(0);
    this.velocity = opts.velocity ?? new Array(dim).fill(0);
    this.mass = opts.mass ?? 1;
    this.maxSpeed = opts.maxSpeed ?? Infinity;
    this.maxForce = opts.maxForce ?? Infinity;
    this.forces = new Set();
  }

  add(force: Force, opts?: { label?: string }): Force {
    this.forces.add(force);
    if (opts?.label) metaMap.set(force, { label: opts.label });
    this.emit('force:added', force);
    return force;
  }

  remove(force: Force): boolean {
    metaMap.delete(force);
    const removed = this.forces.delete(force);
    if (removed) this.emit('force:removed', force);
    return removed;
  }

  clear(): void {
    for (const force of this.forces) {
      metaMap.delete(force);
      this.emit('force:removed', force);
    }
    this.forces.clear();
  }
}

export function getForceLabel(force: Force): string | undefined {
  return metaMap.get(force)?.label;
}
