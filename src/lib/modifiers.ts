import { getVec } from './utils/vecDispatch';
import type { Agent, Force, World } from './Agent';

export function scale(force: Force, k: number): Force {
  return (agent, world, t, dt) => {
    const out = force(agent, world, t, dt);
    return getVec(out.length).scale(out, out, k);
  };
}

export function gate(
  pred: (agent: Agent, world: World, t: number) => boolean,
  force: Force,
): Force {
  return (agent, world, t, dt) => {
    if (!pred(agent, world, t)) return new Array<number>(agent.position.length).fill(0);
    return force(agent, world, t, dt);
  };
}

export function during(start: number, end: number, force: Force): Force {
  return (agent, world, t, dt) => {
    if (t < start || t > end) return new Array<number>(agent.position.length).fill(0);
    return force(agent, world, t, dt);
  };
}

export function fadeIn(duration: number, force: Force): Force {
  let birthTime = NaN;
  return (agent, world, t, dt) => {
    if (isNaN(birthTime)) birthTime = t;
    const k = duration <= 0 ? 1 : Math.min(1, (t - birthTime) / duration);
    const out = force(agent, world, t, dt);
    return getVec(out.length).scale(out, out, k);
  };
}

export function fadeOut(duration: number, force: Force): Force {
  let birthTime = NaN;
  return (agent, world, t, dt) => {
    if (isNaN(birthTime)) birthTime = t;
    const k = duration <= 0 ? 0 : Math.max(0, 1 - (t - birthTime) / duration);
    const out = force(agent, world, t, dt);
    return getVec(out.length).scale(out, out, k);
  };
}

export function sum(...forces: Force[]): Force {
  return (agent, world, t, dt) => {
    const dim = agent.position.length;
    const Fn = getVec(dim);
    const total = new Array<number>(dim).fill(0);
    for (const force of forces) Fn.add(total, total, force(agent, world, t, dt));
    return total;
  };
}
