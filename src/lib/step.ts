import { getVec } from './utils/vecDispatch';
import type { Agent, World } from './Agent';

export function step(agent: Agent, world: World, t: number, dt: number): void {
  if (dt <= 0) return;

  agent.emit('step:before', agent, world, t, dt);

  const snapshot = [...agent.forces];
  const dim = agent.position.length;
  const Fn = getVec(dim);

  const totalForce = new Array<number>(dim).fill(0);
  const tmp = new Array<number>(dim).fill(0);

  for (const force of snapshot) {
    Fn.add(totalForce, totalForce, force(agent, world, t, dt));
  }

  const forceMag = Fn.length(totalForce);
  if (forceMag > agent.maxForce) {
    Fn.scale(totalForce, totalForce, agent.maxForce / forceMag);
  }

  agent.emit('force:applied', [...totalForce]);

  Fn.add(agent.velocity, agent.velocity, Fn.scale(tmp, totalForce, dt / agent.mass));

  const speedMag = Fn.length(agent.velocity);
  if (speedMag > agent.maxSpeed) {
    Fn.scale(agent.velocity, agent.velocity, agent.maxSpeed / speedMag);
  }

  Fn.add(agent.position, agent.position, Fn.scale(tmp, agent.velocity, dt));

  agent.emit('step:after', agent, world, t, dt);
}
