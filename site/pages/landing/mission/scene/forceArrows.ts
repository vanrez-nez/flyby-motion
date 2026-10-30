import * as THREE from 'three';
import type { Agent } from '../../../../../src/index';
import type { ForceKind, InstrumentedForce } from '../sim/instruments';
import type { MissionPalette } from './palette';

/**
 * Force arrows on the drone, like the 2D/3D demos: one arrow per force that explains the motion
 * (goal, avoid, hold), plus the velocity. Altitude hold and damping are left out on purpose, so the
 * arrows on screen are the reasons the drone turns. Lengths are smoothed so they read, not flicker.
 */
export interface ForceArrows {
  group: THREE.Group;
  update(forces: InstrumentedForce[], dt: number): void;
  applyPalette(palette: MissionPalette): void;
  dispose(): void;
}

const DRAWN: ForceKind[] = ['goal', 'avoid', 'hold'];
/** World units per unit of force: a full-strength goal (~7) reads as a ~3.5 m arrow. */
const FORCE_SCALE = 0.5;
const VELOCITY_SCALE = 0.55;
const MAX_LENGTH = 7;
/** Below this the arrow is hidden; above it, it is at least `MIN_LENGTH` long, so it always reads. */
const SHOW_FROM = 0.4;
const MIN_LENGTH = 1.6;

export function createForceArrows(drone: Agent, palette: MissionPalette): ForceArrows {
  const group = new THREE.Group();
  const colorFor = (kind: ForceKind | 'velocity', p: MissionPalette) =>
    kind === 'avoid' ? p.warn : kind === 'hold' ? p.accent : kind === 'velocity' ? p.dim : p.line;

  const make = (kind: ForceKind | 'velocity') => {
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 1, colorFor(kind, palette), 0.7, 0.36);
    // Drawn over the scene, so terrain lines never cut through an arrow.
    (arrow.line.material as THREE.Material).depthTest = false;
    (arrow.cone.material as THREE.Material).depthTest = false;
    arrow.renderOrder = 5;
    arrow.visible = false;
    group.add(arrow);
    return { arrow, kind, length: 0, direction: new THREE.Vector3(0, 0, -1) };
  };

  const arrows = new Map<ForceKind, ReturnType<typeof make>>(DRAWN.map((kind) => [kind, make(kind)]));
  const velocity = make('velocity');
  const sum = new THREE.Vector3();
  const target = new THREE.Vector3();

  const ease = (entry: ReturnType<typeof make>, vector: THREE.Vector3, scale: number, dt: number) => {
    const raw = vector.length() * scale;
    const goal = raw < SHOW_FROM ? 0 : Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, raw));
    entry.length += (goal - entry.length) * Math.min(1, dt * 8);
    if (vector.lengthSq() > 1e-6) entry.direction.lerp(target.copy(vector).normalize(), Math.min(1, dt * 10)).normalize();
    entry.arrow.visible = entry.length > SHOW_FROM;
    if (entry.arrow.visible) {
      entry.arrow.setDirection(entry.direction);
      entry.arrow.setLength(entry.length, Math.min(0.7, entry.length * 0.35), 0.36);
    }
  };

  return {
    group,
    update(forces, dt) {
      group.position.set(drone.position[0], drone.position[1], drone.position[2]);
      for (const [kind, entry] of arrows) {
        sum.set(0, 0, 0);
        for (const force of forces) {
          if (force.kind === kind) sum.add(target.set(force.vector[0], force.vector[1], force.vector[2]));
        }
        ease(entry, target.copy(sum), FORCE_SCALE, dt);
      }
      ease(velocity, target.set(drone.velocity[0], drone.velocity[1], drone.velocity[2]), VELOCITY_SCALE, dt);
    },
    applyPalette(p) {
      for (const [kind, entry] of arrows) entry.arrow.setColor(colorFor(kind, p));
      velocity.arrow.setColor(colorFor('velocity', p));
    },
    dispose() {
      group.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        (mesh.material as THREE.Material | undefined)?.dispose?.();
      });
    },
  };
}

/** A dashed line from the drone to where it is flying to (the waypoint or the target). */
export function createGoalLine(color: THREE.Color): { line: THREE.Line; set(from: number[] | null, to: number[] | null): void; dispose(): void } {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const material = new THREE.LineDashedMaterial({ color, dashSize: 0.6, gapSize: 0.5, transparent: true, opacity: 0.55, fog: true });
  const line = new THREE.Line(geometry, material);
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  return {
    line,
    set(from, to) {
      line.visible = !!from && !!to;
      if (!from || !to) return;
      positions.setXYZ(0, from[0], from[1], from[2]);
      positions.setXYZ(1, to[0], to[1], to[2]);
      positions.needsUpdate = true;
      line.computeLineDistances();
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
