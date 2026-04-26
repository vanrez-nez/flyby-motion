import type { Object3D } from 'three';
import type { Agent } from './Agent';

export function syncThree(
  agent: Agent,
  object: Object3D,
  opts?: { scale?: number },
): () => void {
  const scale = opts?.scale ?? 1;
  const sync = () => {
    object.position.set(
      agent.position[0] * scale,
      agent.position[1] * scale,
      (agent.position[2] ?? 0) * scale,
    );
  };
  sync();
  return agent.on('step:after', sync);
}

interface PixiPositionable {
  x: number;
  y: number;
}

export function syncPixi(agent: Agent, displayObject: PixiPositionable): () => void {
  const sync = () => {
    displayObject.x = agent.position[0];
    displayObject.y = agent.position[1];
  };
  sync();
  return agent.on('step:after', sync);
}

export function syncDom(agent: Agent, element: HTMLElement): () => void {
  const sync = () => {
    element.style.transform = `translate(${agent.position[0]}px, ${agent.position[1]}px)`;
  };
  sync();
  return agent.on('step:after', sync);
}
