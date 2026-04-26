import { getVec } from './utils/vecDispatch';
import type { Agent, Contributor, World } from './Agent';

export function scale(c: Contributor, k: number): Contributor {
  return (agent, world, t, dt) => {
    const force = c(agent, world, t, dt);
    return getVec(force.length).scale(force, force, k);
  };
}

export function gate(
  pred: (agent: Agent, world: World, t: number) => boolean,
  c: Contributor,
): Contributor {
  return (agent, world, t, dt) => {
    if (!pred(agent, world, t)) return new Array<number>(agent.position.length).fill(0);
    return c(agent, world, t, dt);
  };
}

export function during(start: number, end: number, c: Contributor): Contributor {
  return (agent, world, t, dt) => {
    if (t < start || t > end) return new Array<number>(agent.position.length).fill(0);
    return c(agent, world, t, dt);
  };
}

export function fadeIn(duration: number, c: Contributor): Contributor {
  let birthTime = NaN;
  return (agent, world, t, dt) => {
    if (isNaN(birthTime)) birthTime = t;
    const k = duration <= 0 ? 1 : Math.min(1, (t - birthTime) / duration);
    const force = c(agent, world, t, dt);
    return getVec(force.length).scale(force, force, k);
  };
}

export function fadeOut(duration: number, c: Contributor): Contributor {
  let birthTime = NaN;
  return (agent, world, t, dt) => {
    if (isNaN(birthTime)) birthTime = t;
    const k = duration <= 0 ? 0 : Math.max(0, 1 - (t - birthTime) / duration);
    const force = c(agent, world, t, dt);
    return getVec(force.length).scale(force, force, k);
  };
}

export function combined(...cs: Contributor[]): Contributor {
  return (agent, world, t, dt) => {
    const dim = agent.position.length;
    const Fn = getVec(dim);
    const total = new Array<number>(dim).fill(0);
    for (const c of cs) Fn.add(total, total, c(agent, world, t, dt));
    return total;
  };
}
