import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import {
  Agent,
  step,
  type Force,
} from '../../src/index';
import { mountDemoChrome, type DemoKey } from '../shared/demoChrome';
import { mirrorVectorAcrossBounds, type Bounds3 } from '../shared/mirrorBounds';
import {
  centerPoint,
  controlsToValues,
  groupControlsByFolder,
  makePointResolvers,
  numberValue,
  optionalRadius,
  type Control,
  type ControlValues,
  type ModePresentation,
  type PointResolvers,
} from './modeUtils';
import {
  addTrailPoint,
  colors,
  createAgentMesh,
  createMarker,
  createRadiusIndicator,
  createTrail,
  updateArrow,
  updateRadiusIndicator,
  updateTrail,
  type RadiusIndicator,
} from './threeHelpers';

export type ThreeMode = {
  value: string;
  label: string;
  controls: Control[];
  marker?: 'target' | 'source';
  presentation?: ModePresentation | ModePresentation[];
  initialVelocity?: (index: number, count: number) => [number, number, number];
  buildForces: (entry: ThreeAgentEntry, values: ControlValues, context: ThreeDemoContext) => Force[];
};

export type ThreeAgentEntry = {
  agent: Agent;
  mesh: THREE.Mesh;
  trail: THREE.Line;
  trailPositions: number[];
  velocityArrow: THREE.ArrowHelper;
  forceArrow: THREE.ArrowHelper;
  force: number[];
  seeds: { x: number; y: number; z: number };
};

export type ThreeDemoContext = {
  points: PointResolvers;
  leader: Agent;
};

export type ThreeDemoConfig = {
  active: DemoKey;
  paneTitle: string;
  modes: ThreeMode[];
};

const AGENT_COUNT = 3;
const TRAIL_POINTS = 90;
const PLAY_BOUNDS: Bounds3 = {
  x: { min: -11, max: 11 },
  y: { min: -5, max: 9 },
  z: { min: -11, max: 11 },
};
const WORLD: Record<string, unknown> = {};

export async function mountThreeDemo(config: ThreeDemoConfig): Promise<void> {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(colors.bg);
  scene.fog = new THREE.Fog(colors.bg, 12, 34);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(14, 11, 16);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const mount = document.querySelector<HTMLDivElement>('#app');
  if (!mount) throw new Error('Missing #app mount');
  mount.appendChild(renderer.domElement);
  mountDemoChrome(config.active);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.target.set(0, 0.5, 0);

  const paneContainer = document.createElement('div');
  paneContainer.className = 'three-demo__pane';
  mount.appendChild(paneContainer);
  stopCanvasPassthrough(paneContainer);

  const root = new THREE.Group();
  scene.add(root);
  scene.add(new THREE.HemisphereLight(0xb8c7ff, 0x1a2333, 2.3));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
  keyLight.position.set(5, 8, 4);
  scene.add(keyLight);

  const grid = new THREE.GridHelper(24, 48, colors.grid, colors.grid);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.18;
  root.add(grid);

  const targetMarker = createMarker(colors.target);
  targetMarker.position.set(1.8, 0.5, -1.2);
  root.add(targetMarker);

  const sourceMarker = createMarker(colors.source);
  sourceMarker.position.set(-1.8, 0.5, 1.2);
  root.add(sourceMarker);

  const centerMarker = createMarker(0xffffff);
  {
    const center = centerPoint();
    centerMarker.position.set(center[0], center[1], center[2]);
  }
  root.add(centerMarker);

  const leader = new Agent({ position: centerPoint(), velocity: [0, 0, 0], maxSpeed: 7, maxForce: 32 });
  const leaderMarker = createMarker(colors.target);
  root.add(leaderMarker);

  const radiusIndicators: RadiusIndicator[] = [];

  const context: ThreeDemoContext = {
    points: makePointResolvers({
      target: targetMarker,
      source: sourceMarker,
      leader,
    }),
    leader,
  };

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane();
  const dragPoint = new THREE.Vector3();
  const dragOffset = new THREE.Vector3();
  let draggedMarker: THREE.Object3D | undefined;

  let activeMode = config.modes[0];
  let values = controlsToValues(activeMode.controls);
  let entries: ThreeAgentEntry[] = [];
  let pane: Pane | undefined;
  let last = performance.now();
  let t = 0;

  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (event.button !== 2) return;
    event.preventDefault();
    beginMarkerDrag(event);
  });

  renderer.domElement.addEventListener('pointermove', (event) => {
    updateMarkerDrag(event);
  });

  renderer.domElement.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  window.addEventListener('pointerup', () => {
    draggedMarker = undefined;
  });

  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'r') reset();
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  mountPane();
  reset();
  requestAnimationFrame(animate);

  function animate(now: number): void {
    requestAnimationFrame(animate);
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    t += dt;

    updateLeader(t, numberValue(values, 'leaderSpeed', 1.2));
    syncPresentationVisuals();

    entries.forEach((entry) => {
      step(entry.agent, WORLD, t, dt);
      if (mirrorVectorAcrossBounds(entry.agent.position, PLAY_BOUNDS)) {
        entry.trailPositions.length = 0;
      }
      syncEntryVisuals(entry);
    });

    controls.update();
    renderer.render(scene, camera);
  }

  function mountPane(): void {
    pane?.dispose();
    paneContainer.replaceChildren();
    pane = new Pane({ title: config.paneTitle, expanded: true, container: paneContainer });

    const modeProxy = { mode: activeMode.value };
    pane.addBinding(modeProxy, 'mode', {
      label: 'mode',
      options: Object.fromEntries(config.modes.map((mode) => [mode.label, mode.value])),
    }).on('change', (ev) => {
      const nextMode = config.modes.find((mode) => mode.value === ev.value);
      if (!nextMode) return;
      activeMode = nextMode;
      values = controlsToValues(activeMode.controls);
      mountPane();
      reset();
    });

    groupControlsByFolder(activeMode.controls, 'Force').forEach((controlsForFolder, title) => {
      const folder = pane?.addFolder({ title });
      if (!folder) return;

      controlsForFolder.forEach((control) => {
        const proxy = { [control.id]: control.value };
        const params = control.type === 'boolean'
          ? { label: control.label ?? control.id }
          : control.type === 'options'
            ? { label: control.label ?? control.id, options: control.options }
            : {
                min: control.min,
                max: control.max,
                step: control.step,
                label: control.label ?? control.id,
              };

        folder.addBinding(proxy, control.id, params).on('change', (ev) => {
          values[control.id] = ev.value as number | boolean | string;
          rebuildForces();
        });
      });
    });

    pane.addButton({ title: 'Reset' }).on('click', () => reset());
  }

  function reset(): void {
    entries.forEach((entry) => {
      root.remove(entry.mesh, entry.trail, entry.velocityArrow, entry.forceArrow);
      entry.mesh.geometry.dispose();
      (entry.mesh.material as THREE.Material).dispose();
      entry.trail.geometry.dispose();
      (entry.trail.material as THREE.Material).dispose();
    });

    entries = [];
    t = 0;
    leader.position = centerPoint();
    leader.velocity = [0, 0, 0];
    syncPresentationVisuals();

    for (let i = 0; i < AGENT_COUNT; i++) {
      const angle = (i / AGENT_COUNT) * Math.PI * 2 + Math.PI / 6;
      const position: [number, number, number] = [
        Math.cos(angle) * 1.6,
        0.45 + i * 0.15,
        Math.sin(angle) * 1.6,
      ];
      const agent = new Agent({
        position,
        velocity: activeMode.initialVelocity?.(i, AGENT_COUNT) ?? [0, 0, 0],
        mass: 1,
        maxSpeed: 7,
        maxForce: 32,
      });
      const mesh = createAgentMesh(i);
      const trail = createTrail();
      const velocityArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0, colors.velocity);
      const forceArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0, colors.force);
      const entry: ThreeAgentEntry = {
        agent,
        mesh,
        trail,
        trailPositions: [],
        velocityArrow,
        forceArrow,
        force: [0, 0, 0],
        seeds: {
          x: Math.random() * 10000,
          y: Math.random() * 10000,
          z: Math.random() * 10000,
        },
      };

      agent.on('force:applied', (force) => {
        entry.force = force as number[];
      });

      root.add(trail, mesh, velocityArrow, forceArrow);
      entries.push(entry);
      syncEntryVisuals(entry);
    }

    rebuildForces();
  }

  function rebuildForces(): void {
    entries.forEach((entry) => {
      entry.agent.clear();
      activeMode.buildForces(entry, values, context).forEach((force) => {
        entry.agent.add(force, { label: activeMode.value });
      });
    });
  }

  function syncEntryVisuals(entry: ThreeAgentEntry): void {
    const [x, y, z] = entry.agent.position;
    entry.mesh.position.set(x, y, z);
    addTrailPoint(entry.trailPositions, entry.agent.position, TRAIL_POINTS);
    updateTrail(entry.trail, entry.trailPositions);
    updateArrow(entry.velocityArrow, entry.agent.position, entry.agent.velocity, 0.22, 1.5);
    updateArrow(entry.forceArrow, entry.agent.position, entry.force, 0.08, 1.4);
  }

  function updateLeader(time: number, speed: number): void {
    const phase = time * speed;
    const next = [
      Math.cos(phase * 0.9) * 4.2,
      0.8 + Math.sin(phase * 1.3) * 1.4,
      Math.sin(phase * 0.7) * 4.2,
    ];

    leader.velocity[0] = (next[0] - leader.position[0]) * 5;
    leader.velocity[1] = (next[1] - leader.position[1]) * 5;
    leader.velocity[2] = (next[2] - leader.position[2]) * 5;
    leader.position[0] = next[0];
    leader.position[1] = next[1];
    leader.position[2] = next[2];
  }

  function beginMarkerDrag(event: PointerEvent): void {
    if (!activeMode.marker) return;
    const marker = activeMode.marker === 'source' ? sourceMarker : targetMarker;
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    dragPlane.setFromNormalAndCoplanarPoint(cameraDirection, marker.position);

    if (!intersectDragPlane(event)) return;
    draggedMarker = marker;
    dragOffset.subVectors(marker.position, dragPoint);
  }

  function updateMarkerDrag(event: PointerEvent): void {
    if (!draggedMarker || !intersectDragPlane(event)) return;

    draggedMarker.position.copy(dragPoint).add(dragOffset);
    draggedMarker.position.x = THREE.MathUtils.clamp(
      draggedMarker.position.x,
      PLAY_BOUNDS.x.min,
      PLAY_BOUNDS.x.max,
    );
    draggedMarker.position.y = THREE.MathUtils.clamp(
      draggedMarker.position.y,
      PLAY_BOUNDS.y.min,
      PLAY_BOUNDS.y.max,
    );
    draggedMarker.position.z = THREE.MathUtils.clamp(
      draggedMarker.position.z,
      PLAY_BOUNDS.z.min,
      PLAY_BOUNDS.z.max,
    );
  }

  function intersectDragPlane(event: PointerEvent): boolean {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.ray.intersectPlane(dragPlane, dragPoint) !== null;
  }

  function syncPresentationVisuals(): void {
    const presentations = normalizePresentations(activeMode.presentation);
    const pointsShown = new Set(presentations.map((p) => p.point));

    targetMarker.visible = activeMode.marker === 'target' || pointsShown.has('target');
    sourceMarker.visible = activeMode.marker === 'source' || pointsShown.has('source');
    leaderMarker.visible = pointsShown.has('leader');
    centerMarker.visible = pointsShown.has('center');

    leaderMarker.position.set(leader.position[0], leader.position[1], leader.position[2]);
    const center = centerPoint();
    centerMarker.position.set(center[0], center[1], center[2]);

    let used = 0;
    presentations.forEach((presentation) => {
      const radius = optionalRadius(values, presentation.radiusControl);
      if (!radius) return;
      const indicator = ensureRadiusIndicator(used);
      const point = context.points[presentation.point]();
      const color = presentation.intent === 'reject' ? colors.source : colors.target;
      indicator.group.visible = true;
      const cameraDistance = camera.position.distanceTo(
        new THREE.Vector3(point[0], point[1], point[2]),
      );
      updateRadiusIndicator(indicator, point, radius, color, cameraDistance);
      used += 1;
    });

    for (let i = used; i < radiusIndicators.length; i++) {
      radiusIndicators[i].group.visible = false;
    }
  }

  function ensureRadiusIndicator(index: number): RadiusIndicator {
    while (radiusIndicators.length <= index) {
      const indicator = createRadiusIndicator();
      indicator.group.visible = false;
      root.add(indicator.group);
      radiusIndicators.push(indicator);
    }
    return radiusIndicators[index];
  }
}

function normalizePresentations(
  presentation: ModePresentation | ModePresentation[] | undefined,
): ModePresentation[] {
  if (!presentation) return [];
  return Array.isArray(presentation) ? presentation : [presentation];
}

function stopCanvasPassthrough(element: HTMLElement): void {
  const stop = (event: Event) => event.stopPropagation();
  element.addEventListener('pointerdown', stop);
  element.addEventListener('pointermove', stop);
  element.addEventListener('pointerup', stop);
  element.addEventListener('pointercancel', stop);
  element.addEventListener('click', stop);
  element.addEventListener('wheel', stop);
}
