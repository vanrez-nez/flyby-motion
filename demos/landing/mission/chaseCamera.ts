import * as THREE from 'three';
import { Agent, behaviors, step } from '../../../src/index';
import { terrainHeight } from './world';

/**
 * The chase camera is itself a flyby-motion agent: `behaviors.arrive` towards a point behind and
 * above the drone, so its lag and settle come from the same forces as everything else. It looks
 * slightly ahead of the drone and never dips into the terrain.
 */
export interface ChaseCamera {
  update(t: number, dt: number): void;
  /** Wider and further back on narrow (portrait) screens. */
  setCompact(compact: boolean): void;
  snap(): void;
}

export function createChaseCamera(camera: THREE.PerspectiveCamera, drone: Agent): ChaseCamera {
  const offset = { back: 9, up: 3.6 };
  const anchor = [0, 0, 0];
  const cameraAgent = new Agent({ position: [...drone.position], velocity: [0, 0, 0], maxSpeed: 30, maxForce: 140 });
  cameraAgent.add(behaviors.arrive(() => anchor, { strength: 60, slowR: 6, damp: 3.2 }), { label: 'chase' });

  const heading = new THREE.Vector3(0, 0, -1);
  const lookAt = new THREE.Vector3();
  const smoothLook = new THREE.Vector3();

  const placeAnchor = () => {
    const [vx, , vz] = drone.velocity;
    const speed = Math.hypot(vx, vz);
    // Keep the last heading while hovering, so the camera doesn't swing around.
    if (speed > 0.6) heading.lerp(new THREE.Vector3(vx / speed, 0, vz / speed), 0.08).normalize();
    const [x, y, z] = drone.position;
    anchor[0] = x - heading.x * offset.back;
    anchor[2] = z - heading.z * offset.back;
    anchor[1] = Math.max(y + offset.up, terrainHeight(anchor[0], anchor[2]) + 2.5);
  };

  const aim = (blend: number) => {
    const [x, y, z] = drone.position;
    lookAt.set(x + heading.x * 6, y + 0.4, z + heading.z * 6);
    smoothLook.lerp(lookAt, blend);
    camera.lookAt(smoothLook);
  };

  return {
    update(t, dt) {
      placeAnchor();
      step(cameraAgent, {}, t, dt);
      const [cx, cy, cz] = cameraAgent.position;
      camera.position.set(cx, cy, cz);
      aim(Math.min(1, dt * 6));
    },
    setCompact(compact) {
      offset.back = compact ? 12 : 9;
      offset.up = compact ? 4.6 : 3.6;
    },
    snap() {
      placeAnchor();
      cameraAgent.position = [...anchor];
      cameraAgent.velocity = [0, 0, 0];
      camera.position.set(anchor[0], anchor[1], anchor[2]);
      aim(1);
    },
  };
}
