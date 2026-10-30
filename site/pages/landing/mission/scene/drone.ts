import * as THREE from 'three';
import type { Agent } from '../../../../../src/index';

/**
 * The drone, drawn in wireframe to match the line-and-point references: X-frame body, four
 * arms, rotor discs as spinning rings, and a pulsing nav light. It faces its velocity and banks
 * and pitches with the steering force it receives (the agent's `force:applied` event).
 */
export interface DroneView {
  group: THREE.Group;
  update(dt: number): void;
  dispose(): void;
}

export function createDrone(agent: Agent, color: THREE.Color, accent: THREE.Color): DroneView {
  const group = new THREE.Group();
  const frame = new THREE.Group();
  group.add(frame);

  const line = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
  const arms: number[] = [];
  const armLength = 0.85;
  for (const angle of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
    arms.push(0, 0, 0, Math.cos(angle) * armLength, 0, Math.sin(angle) * armLength);
  }
  const armGeometry = new THREE.BufferGeometry();
  armGeometry.setAttribute('position', new THREE.Float32BufferAttribute(arms, 3));
  frame.add(new THREE.LineSegments(armGeometry, line));

  // Body: a flat box outline.
  const body = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.5, 0.18, 0.7)), line);
  frame.add(body);

  // Rotors: a ring per arm tip, spun every frame.
  const rotors: THREE.Group[] = [];
  const rotorGeometry = new THREE.BufferGeometry().setFromPoints(
    new THREE.EllipseCurve(0, 0, 0.36, 0.36, 0, Math.PI * 1.7).getPoints(24).map((p) => new THREE.Vector3(p.x, 0, p.y)),
  );
  for (const angle of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
    const rotor = new THREE.Group();
    rotor.position.set(Math.cos(angle) * armLength, 0.06, Math.sin(angle) * armLength);
    rotor.add(new THREE.Line(rotorGeometry, line));
    frame.add(rotor);
    rotors.push(rotor);
  }

  // Nav light: an accent point under the nose, and a soft halo.
  const lightMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true });
  const navLight = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), lightMaterial);
  navLight.position.set(0, -0.08, -0.38);
  frame.add(navLight);

  // Steering force, for bank and pitch, from the library's debug event.
  const steering = new THREE.Vector3();
  const off = agent.on('force:applied', (total) => {
    const f = total as number[];
    steering.set(f[0], f[1], f[2]);
  });

  const velocity = new THREE.Vector3();
  const heading = new THREE.Quaternion();
  const look = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);
  const local = new THREE.Vector3();
  const origin = new THREE.Vector3();
  const inverse = new THREE.Vector3();
  const inverseQuat = new THREE.Quaternion();
  let time = 0;

  return {
    group,
    update(dt) {
      time += dt;
      const [x, y, z] = agent.position;
      group.position.set(x, y, z);

      // Face the direction of travel (on the ground plane), smoothly; hold heading when hovering.
      velocity.set(agent.velocity[0], 0, agent.velocity[2]);
      if (velocity.lengthSq() > 1) {
        look.lookAt(origin, inverse.copy(velocity).negate(), up);
        heading.setFromRotationMatrix(look);
        group.quaternion.slerp(heading, Math.min(1, dt * 3));
      }

      // A gentle bank into turns and pitch into acceleration, from the steering force in the
      // drone's frame. Small angles and slow easing: it should lean, not twitch.
      local.copy(steering).applyQuaternion(inverseQuat.copy(group.quaternion).invert());
      const bank = THREE.MathUtils.clamp(-local.x * 0.012, -0.3, 0.3);
      const pitch = THREE.MathUtils.clamp(local.z * 0.01, -0.2, 0.2);
      frame.rotation.z += (bank - frame.rotation.z) * Math.min(1, dt * 2.5);
      frame.rotation.x += (pitch - frame.rotation.x) * Math.min(1, dt * 2.5);

      for (let i = 0; i < rotors.length; i++) rotors[i].rotation.y += dt * (i % 2 ? 38 : -38);
      lightMaterial.opacity = 0.55 + Math.sin(time * 6) * 0.45;
    },
    dispose() {
      off();
      armGeometry.dispose();
      body.geometry.dispose();
      rotorGeometry.dispose();
      line.dispose();
      navLight.geometry.dispose();
      lightMaterial.dispose();
    },
  };
}

/** The target vehicle: a smaller wireframe diamond with a ring, so it reads as "the contact". */
export function createTargetView(agent: Agent, color: THREE.Color): { group: THREE.Group; update(dt: number): void; dispose(): void } {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
  const shape = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.55)), material);
  group.add(shape);
  const ring = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, 1.1, 1.1).getPoints(40).map((p) => new THREE.Vector3(p.x, 0, p.y))),
    material,
  );
  group.add(ring);
  let time = 0;
  return {
    group,
    update(dt) {
      time += dt;
      group.position.set(agent.position[0], agent.position[1], agent.position[2]);
      shape.rotation.y = time * 1.6;
      ring.rotation.x = Math.sin(time * 1.3) * 0.4;
    },
    dispose() {
      shape.geometry.dispose();
      ring.geometry.dispose();
      material.dispose();
    },
  };
}
