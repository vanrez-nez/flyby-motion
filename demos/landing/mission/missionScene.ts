import * as THREE from 'three';
import { onFrame, type FrameUpdater } from '../../../src/index';
import { waitForStableSize } from '../../shared/waitForStableSize';
import { createChaseCamera } from './chaseCamera';
import { createHudPublisher } from './hudPublisher';
import type { HudAnchors, HudMessage, HudSnapshot } from './hudState';
import { createMission, type HudEvent, type MissionState } from './missionScript';
import { readPalette } from './palette';
import { createSceneObjects, type Detail } from './sceneObjects';
import { createWorld } from './world';

/**
 * The landing mission scene: renderer, frame loop, sizing and theme. The simulation lives in
 * missionScript.ts; this file draws it and publishes what the HUD needs.
 */
export interface MissionSceneOptions {
  container: HTMLElement;
  onSnapshot: (snapshot: HudSnapshot) => void;
  onMessage: (message: HudMessage) => void;
  /** Written every frame; read by the HUD's own animation frame. */
  anchors: HudAnchors;
}

export interface MissionScene {
  dispose(): void;
}

const COMPACT_QUERY = '(max-width: 860px)';

function detailFor(compact: boolean): Detail {
  return compact
    ? { terrainRows: 42, terrainSamples: 70, pointsPerSpire: 70 }
    : { terrainRows: 72, terrainSamples: 120, pointsPerSpire: 140 };
}

export async function createMissionScene(options: MissionSceneOptions, signal: AbortSignal): Promise<MissionScene> {
  const { container, onSnapshot, onMessage, anchors } = options;
  const size = await waitForStableSize(container, signal);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compactQuery = window.matchMedia(COMPACT_QUERY);
  let compact = compactQuery.matches;

  const renderer = new THREE.WebGLRenderer({ antialias: !compact, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, compact ? 1.25 : 1.75));
  renderer.setSize(size.width, size.height);
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(compact ? 62 : 55, size.width / size.height, 0.1, 260);
  let palette = readPalette(container);
  scene.fog = new THREE.Fog(palette.background, 30, 120);

  const pending: HudEvent[] = [];
  const mission = createMission(createWorld(compact ? 34 : 46), (event) => pending.push(event));
  const objects = createSceneObjects(mission, palette, detailFor(compact));
  scene.add(objects.root);
  const chase = createChaseCamera(camera, mission.drone);
  chase.setCompact(compact);
  const hud = createHudPublisher(mission, camera, container, onSnapshot);

  // Theme: recolor lines and fog when the theme switcher changes.
  const schemeObserver = new MutationObserver(() => {
    palette = readPalette(container);
    (scene.fog as THREE.Fog).color.copy(palette.background);
    objects.applyPalette(palette);
    if (reducedMotion) renderer.render(scene, camera);
  });
  schemeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });

  const resizeObserver = new ResizeObserver(() => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (reducedMotion) renderer.render(scene, camera);
  });
  resizeObserver.observe(container);
  const onCompactChange = () => {
    compact = compactQuery.matches;
    camera.fov = compact ? 62 : 55;
    camera.updateProjectionMatrix();
    chase.setCompact(compact);
  };
  compactQuery.addEventListener('change', onCompactChange);

  // Where the drone is heading, for the dashed goal line: the waypoint, or the target when locked.
  const goalOf = (state: MissionState): number[] | null =>
    state.targetLocked ? mission.target.position : state.waypoint?.position ?? null;

  let messageId = 0;
  let lastPhase = -1;
  // Mission time accumulates frame deltas: `onFrame` restarts its elapsed time at 0 on every
  // start(), and the loop is stopped/started as the scene scrolls out of and into view.
  let clock = 1 / 60;
  const frame = (_elapsed: number, dt: number) => {
    clock += dt;
    const t = clock;
    const state = mission.update(t, dt);
    if (state.phaseIndex !== lastPhase) {
      if (state.phaseIndex === 0) objects.trail.reset();
      lastPhase = state.phaseIndex;
      for (const waypoint of mission.world.waypoints) {
        objects.pins.get(waypoint.id)?.setActive(state.waypoint?.label === waypoint.label);
      }
    }
    for (const event of pending.splice(0)) {
      onMessage({ id: ++messageId, text: event.text, tone: event.tone, at: t });
    }

    const targetShown = state.targetVisible;
    objects.drone.update(dt);
    objects.target.update(dt);
    objects.target.group.visible = targetShown;
    objects.arrows.update(state.activeForces, dt);
    objects.goalLine.set(mission.drone.position, goalOf(state));
    objects.trail.push(mission.drone.position);
    for (const pin of objects.pins.values()) {
      pin.rings.forEach((ring, i) => ring.scale.setScalar(1 + ((t * 0.8 + i * 0.5) % 1) * 0.35));
    }

    chase.update(t, dt);
    renderer.render(scene, camera);
    hud.projectAnchors(anchors, targetShown);
    hud.publish(state, t);
  };

  // Reduced motion: one still frame, 30 s into the mission. Otherwise the loop, on screen only.
  let updater: FrameUpdater | null = null;
  if (reducedMotion) {
    let state = mission.update(1 / 60, 1 / 60);
    for (let i = 2; i <= 60 * 30; i++) state = mission.update(i / 60, 1 / 60);
    pending.length = 0;
    objects.drone.update(1);
    objects.target.update(0);
    objects.target.group.visible = state.targetVisible;
    objects.arrows.update(state.activeForces, 1);
    objects.goalLine.set(mission.drone.position, goalOf(state));
    chase.snap();
    renderer.render(scene, camera);
    hud.projectAnchors(anchors, state.targetVisible);
    hud.publish(state, 30, true);
  } else {
    mission.update(1 / 60, 1 / 60);
    chase.snap();
    updater = onFrame(frame, { maxDelta: 1 / 30, autoStart: false, visibleOnly: true });
  }

  const visibility = new IntersectionObserver(([entry]) => {
    if (!updater) return;
    if (entry.isIntersecting) updater.start();
    else updater.stop();
  });
  visibility.observe(container);

  // Dev-only hook for checking the scene from the browser console (stripped from production builds).
  if (import.meta.env.DEV) {
    (container as HTMLElement & { __missionDebug?: unknown }).__missionDebug = { objects, mission, camera };
  }

  return {
    dispose() {
      updater?.stop();
      visibility.disconnect();
      resizeObserver.disconnect();
      schemeObserver.disconnect();
      compactQuery.removeEventListener('change', onCompactChange);
      objects.dispose();
      mission.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
