import { EventEmitter } from './utils/EventEmitter';

export type World = Record<string, unknown>;
export type Contributor = (agent: Agent, world: World, t: number, dt: number) => number[];

export interface AgentOptions {
  position?: number[];
  velocity?: number[];
  mass?: number;
  maxSpeed?: number;
  maxForce?: number;
}

const metaMap = new WeakMap<Contributor, { label?: string }>();

export class Agent extends EventEmitter {
  position: number[];
  velocity: number[];
  mass: number;
  maxSpeed: number;
  maxForce: number;
  contributors: Set<Contributor>;

  constructor(opts: AgentOptions = {}) {
    super();
    const dim = opts.position?.length ?? 2;
    this.position = opts.position ?? new Array(dim).fill(0);
    this.velocity = opts.velocity ?? new Array(dim).fill(0);
    this.mass = opts.mass ?? 1;
    this.maxSpeed = opts.maxSpeed ?? Infinity;
    this.maxForce = opts.maxForce ?? Infinity;
    this.contributors = new Set();
  }

  add(c: Contributor, opts?: { label?: string }): Contributor {
    this.contributors.add(c);
    if (opts?.label) metaMap.set(c, { label: opts.label });
    this.emit('contributor:added', c);
    return c;
  }

  remove(c: Contributor): boolean {
    metaMap.delete(c);
    const removed = this.contributors.delete(c);
    if (removed) this.emit('contributor:removed', c);
    return removed;
  }

  clear(): void {
    for (const c of this.contributors) {
      metaMap.delete(c);
      this.emit('contributor:removed', c);
    }
    this.contributors.clear();
  }
}

export function getContributorLabel(c: Contributor): string | undefined {
  return metaMap.get(c)?.label;
}
