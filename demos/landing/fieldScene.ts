import * as THREE from 'three';
import { onFrame, step, type FrameUpdater } from '../../src/index';
import { galaxy, imageFormation, sphere, torusKnot, type Formation } from './shapes';
import { createParticleField, FAR_AWAY } from './fieldParticles';
import { createParticleCloud } from './fieldRender';

/**
 * The landing background: a field of flyby-motion agents in 3D that morphs between formations
 * (sphere → torus knot → galaxy → the flyby logo), swirls, drifts, dodges the pointer and
 * bursts on click. See fieldParticles.ts for the forces.
 */

export interface FieldSceneOptions {
  container: HTMLElement;
  logoUrl?: string;
  onFormationChange?: (name: string) => void;
}

export interface FieldScene {
  dispose(): void;
}

const MORPH_INTERVAL = 8;

function agentCount(width: number, height: number): number {
  return Math.round(Math.min(2200, Math.max(700, (width * height) / 900)));
}

export function createFieldScene({ container, logoUrl, onFormationChange }: FieldSceneOptions): FieldScene {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const count = agentCount(Math.max(1, container.clientWidth), Math.max(1, container.clientHeight));
  let disposed = false;

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(0, 0, 17);
  const fieldGroup = new THREE.Group();
  fieldGroup.rotation.x = 0.25;
  scene.add(fieldGroup);

  const formations: Formation[] = [sphere(count), torusKnot(count), galaxy(count)];
  let formationIndex = 0;
  const field = createParticleField(formations[0].points, count, !reducedMotion);
  const cloud = createParticleCloud(count);
  fieldGroup.add(cloud.points);
  onFormationChange?.(formations[0].name);

  if (logoUrl) {
    imageFormation(logoUrl, count).then((logo) => {
      if (!disposed && logo) formations.push(logo);
    });
  }

  // Layout: the field sits on the right on wide screens, dimmed behind the hero on narrow ones.
  let wide = true;
  function layout(): void {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const halfWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
    wide = camera.aspect > 1.15;
    fieldGroup.position.x = wide ? halfWidth * 0.42 : 0;
    fieldGroup.scale.setScalar(wide ? 1 : Math.min(1, camera.aspect * 0.95));
    cloud.setAppearance(!wide);
  }

  // Pointer, projected onto the plane through the field and expressed in its local space.
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();

  function projectPointer(event: PointerEvent, out: number[]): boolean {
    const rect = container.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom) return false;
    ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.ray.intersectPlane(plane, hit)) return false;
    fieldGroup.worldToLocal(hit);
    out[0] = hit.x;
    out[1] = hit.y;
    out[2] = hit.z;
    return true;
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!projectPointer(event, field.pointer)) field.pointer.fill(FAR_AWAY);
  };
  const onPointerLeave = () => field.pointer.fill(FAR_AWAY);
  const burstOrigin = [0, 0, 0];
  const onPointerDown = (event: PointerEvent) => {
    // Only from the background itself, not from the hero's buttons and links.
    const target = event.target as HTMLElement | null;
    if (target?.closest('a, button, input, tp-button, tp-copy-button, tp-command-palette, header')) return;
    if (projectPointer(event, burstOrigin)) field.burst(burstOrigin);
  };

  function render(): void {
    fieldGroup.rotation.y = spin;
    cloud.update(field.particles);
    renderer.render(scene, camera);
  }

  // The field spins slowly; a facing formation eases it to the nearest front-on turn instead.
  const SPIN_SPEED = 0.07;
  let spin = 0;
  function updateSpin(delta: number): void {
    if (formations[formationIndex].facing) {
      const front = Math.round(spin / (Math.PI * 2)) * Math.PI * 2;
      spin += (front - spin) * Math.min(1, delta * 2.5);
    } else {
      spin += SPIN_SPEED * delta;
    }
  }

  const world = {};
  let nextMorph = MORPH_INTERVAL;
  function tick(elapsed: number, delta: number): void {
    if (elapsed >= nextMorph) {
      nextMorph = elapsed + MORPH_INTERVAL;
      formationIndex = (formationIndex + 1) % formations.length;
      field.setTargets(formations[formationIndex].points, formations[formationIndex].facing);
      onFormationChange?.(formations[formationIndex].name);
    }
    updateSpin(delta);
    for (const particle of field.particles) step(particle.agent, world, elapsed, delta);
    render();
  }

  layout();
  const resizeObserver = new ResizeObserver(() => {
    layout();
    if (reducedMotion) render();
  });
  resizeObserver.observe(container);
  const schemeObserver = new MutationObserver(() => {
    cloud.setAppearance(!wide);
    if (reducedMotion) render();
  });
  schemeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });

  let frame: FrameUpdater | null = null;
  if (reducedMotion) {
    render();
  } else {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    frame = onFrame(tick, { maxDelta: 1 / 30, autoStart: true, visibleOnly: true });
  }

  return {
    dispose() {
      disposed = true;
      frame?.stop();
      resizeObserver.disconnect();
      schemeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      field.dispose();
      cloud.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
