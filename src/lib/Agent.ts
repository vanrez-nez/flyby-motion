/**
 * Agent — holds kinematic state and a bag of contributors.
 *
 * The kernel invariant: contributors read agent state and return force vectors;
 * they never mutate agent directly. Only the integrator (step) writes to
 * position / velocity.
 */

/** Shared world state passed verbatim through the kernel to every contributor. */
export type World = Record<string, unknown>;

/** A contributor produces a force vector given agent state and world context. */
export type Contributor = (agent: Agent, world: World, t: number, dt: number) => number[];

export interface AgentOptions {
  /** Position vector (defaults to 2D zero). */
  position?: number[];
  /** Velocity vector (defaults to zero, same dimension as position). */
  velocity?: number[];
  /** Mass > 0 (default 1). */
  mass?: number;
  /** Maximum speed magnitude (default Infinity). */
  maxSpeed?: number;
  /** Maximum force magnitude (default Infinity). */
  maxForce?: number;
}

const metaMap = new WeakMap<Contributor, { label?: string }>();

export class Agent {
  position: number[];
  velocity: number[];
  mass: number;
  maxSpeed: number;
  maxForce: number;
  contributors: Set<Contributor>;

  constructor(opts: AgentOptions = {}) {
    const dim = opts.position?.length ?? 2;
    this.position = opts.position ?? new Array(dim).fill(0);
    this.velocity = opts.velocity ?? new Array(dim).fill(0);
    this.mass = opts.mass ?? 1;
    this.maxSpeed = opts.maxSpeed ?? Infinity;
    this.maxForce = opts.maxForce ?? Infinity;
    this.contributors = new Set();
  }

  /** Add a contributor to the agent's bag. Returns the contributor as a handle. */
  add(c: Contributor, opts?: { label?: string }): Contributor {
    this.contributors.add(c);
    if (opts?.label) {
      metaMap.set(c, { label: opts.label });
    }
    return c;
  }

  /** Remove a contributor. Returns true if it was present. */
  remove(c: Contributor): boolean {
    metaMap.delete(c);
    return this.contributors.delete(c);
  }

  /** Remove all contributors. */
  clear(): void {
    for (const c of this.contributors) {
      metaMap.delete(c);
    }
    this.contributors.clear();
  }
}

/** Get optional debug label for a contributor. */
export function getContributorLabel(c: Contributor): string | undefined {
  return metaMap.get(c)?.label;
}
