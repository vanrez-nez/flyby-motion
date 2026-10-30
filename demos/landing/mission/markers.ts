import * as THREE from 'three';
import { seededRandom, type Spire, type Waypoint } from './world';

/**
 * World markers in the style of docs/ideas/drone-hud-reference-map.png: point-cloud spires, and
 * beacons on poles for waypoints.
 */

/** Soft round dot, so points read as glowing particles instead of squares. */
export function makeDotTexture(): THREE.Texture {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** All spires as one point cloud: points scattered in a tapering column, denser at the base. */
export function createSpires(spires: Spire[], pointsPerSpire: number, material: THREE.PointsMaterial): THREE.Points {
  const random = seededRandom(9);
  const positions = new Float32Array(spires.length * pointsPerSpire * 3);
  let i = 0;
  for (const spire of spires) {
    const [x, y, z] = spire.position;
    for (let p = 0; p < pointsPerSpire; p++) {
      const t = Math.pow(random(), 0.8);
      const radius = spire.radius * (1 - t * 0.85) * Math.sqrt(random());
      const angle = random() * Math.PI * 2;
      positions[i++] = x + Math.cos(angle) * radius;
      positions[i++] = y + t * spire.height;
      positions[i++] = z + Math.sin(angle) * radius;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(geometry, material);
}


/**
 * A waypoint's state in the current loop:
 * - `pending`: not reached yet and not the current objective: dim, still.
 * - `active`: the current objective: the beacon pulses and emits signal waves.
 * - `reached`: the drone got there: the beacon switches off (the light collapses, a pulse drops
 *   down the pole into the ground) and the pin stays dim for the rest of the loop.
 */
export type BeaconState = 'pending' | 'active' | 'reached';

export interface WaypointPin {
  group: THREE.Group;
  setState(state: BeaconState): void;
  update(dt: number): void;
}

const WAVES = 3;
const WAVE_PERIOD = 1.8; // seconds for one wave to expand and fade
const WAVE_RADIUS = 3.2;
/** Switch-off: the light collapses, then a pulse falls down the pole and hits the ground. */
const COLLAPSE = 0.3;
/** Seconds from reaching the beacon to the pulse hitting the ground, when the terrain scan starts. */
export const BEACON_DROP = COLLAPSE + 0.45;

/**
 * A beacon over a pole: a glowing sphere at the waypoint's flight height, with expanding rings that
 * emit from it while it is the active objective. The pole drops to the ground with a small ring at
 * its foot. The rings are horizontal; the beacon is a sphere so it reads from any angle.
 */
export function createWaypointPin(waypoint: Waypoint, groundY: number, color: THREE.Color, dot: THREE.Texture): WaypointPin {
  const group = new THREE.Group();
  const [x, y, z] = waypoint.position;
  const height = y - groundY;
  group.position.set(x, groundY, z);

  const lineMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45, fog: true });
  const pole = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, height, 0)]);
  group.add(new THREE.Line(pole, lineMaterial));

  const footMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false, fog: true });
  const foot = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.8, 40), footMaterial);
  foot.rotation.x = -Math.PI / 2;
  foot.position.y = 0.05;
  group.add(foot);

  // The beacon: a solid sphere and a soft halo sprite around it.
  const beacon = new THREE.Group();
  beacon.position.y = height;
  group.add(beacon);
  const coreMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, fog: true });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), coreMaterial);
  beacon.add(core);
  const haloMaterial = new THREE.SpriteMaterial({ map: dot, color, transparent: true, opacity: 0.25, depthWrite: false, fog: true });
  const halo = new THREE.Sprite(haloMaterial);
  halo.scale.setScalar(1.8);
  beacon.add(halo);

  // Waves: horizontal rings that expand out of the beacon and fade, staggered.
  const ringGeometry = new THREE.RingGeometry(0.94, 1, 56);
  const waves = Array.from({ length: WAVES }, () => {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: true });
    const wave = new THREE.Mesh(ringGeometry, material);
    wave.rotation.x = -Math.PI / 2;
    wave.visible = false;
    beacon.add(wave);
    return { wave, material };
  });

  // The switch-off pulse: a ring that falls from the beacon down the pole.
  const dropMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: true });
  const drop = new THREE.Mesh(ringGeometry, dropMaterial);
  drop.rotation.x = -Math.PI / 2;
  drop.visible = false;
  group.add(drop);

  let state: BeaconState = 'pending';
  let time = 0;

  const showLight = (visible: boolean) => {
    core.visible = visible;
    halo.visible = visible;
  };

  return {
    group,
    setState(next) {
      if (next === state) return;
      state = next;
      time = 0;
      waves.forEach(({ wave }) => { wave.visible = false; });
      core.scale.setScalar(1);
      halo.scale.setScalar(1.8);
      drop.visible = false;
      showLight(true);
      lineMaterial.opacity = state === 'active' ? 0.85 : state === 'reached' ? 0.2 : 0.45;
      footMaterial.opacity = state === 'active' ? 0.75 : state === 'reached' ? 0.2 : 0.4;
      coreMaterial.opacity = state === 'pending' ? 0.5 : 1;
      haloMaterial.opacity = state === 'pending' ? 0.25 : 0.6;
    },
    update(dt) {
      if (state === 'pending') return;
      time += dt;
      if (state === 'reached') {
        if (time < COLLAPSE) {
          // The light flares and shrinks to nothing.
          const k = time / COLLAPSE;
          core.scale.setScalar(1 - k);
          halo.scale.setScalar(1.8 + k * 2.4);
          haloMaterial.opacity = 0.6 * (1 - k);
        } else if (time < BEACON_DROP) {
          showLight(false);
          // Falls with gravity's ease-in, tightening as it goes.
          const k = (time - COLLAPSE) / (BEACON_DROP - COLLAPSE);
          drop.visible = true;
          drop.position.y = height * (1 - k * k);
          drop.scale.setScalar(0.9 - k * 0.4);
          dropMaterial.opacity = 0.9;
        } else {
          showLight(false);
          drop.visible = false;
        }
        return;
      }
      // Active: the beacon pulses and each wave grows to WAVE_RADIUS and fades, one after another.
      const pulse = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 / WAVE_PERIOD);
      core.scale.setScalar(1 + pulse * 0.25);
      haloMaterial.opacity = 0.25 + pulse * 0.3;
      waves.forEach(({ wave, material }, i) => {
        const phase = ((time / WAVE_PERIOD) + i / WAVES) % 1;
        wave.visible = true;
        wave.scale.setScalar(0.3 + phase * WAVE_RADIUS);
        material.opacity = (1 - phase) * 0.8;
      });
    },
  };
}
