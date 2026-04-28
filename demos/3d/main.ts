import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import {
  Agent,
  falloff,
  forces,
  step,
  type FalloffFn,
  type Force,
} from '../../src/index';
import { mountDemoChrome } from '../shared/demoChrome';
import { mirrorVectorAcrossBounds, type Bounds3 } from '../shared/mirrorBounds';

type Control =
  | {
      type?: 'number';
      id: string;
      label?: string;
      folder?: string;
      value: number;
      min: number;
      max: number;
      step: number;
    }
  | {
      type: 'boolean';
      id: string;
      label?: string;
      folder?: string;
      value: boolean;
    }
  | {
      type: 'options';
      id: string;
      label?: string;
      folder?: string;
      value: string;
      options: Record<string, string>;
    };

type ControlValues = Record<string, number | boolean | string>;

type Mode = {
  value: string;
  label: string;
  controls: Control[];
  marker?: 'target' | 'source';
  initialVelocity?: (index: number, count: number) => [number, number, number];
  buildForces: (entry: AgentEntry, values: ControlValues) => Force[];
};

type AgentEntry = {
  agent: Agent;
  mesh: THREE.Mesh;
  trail: THREE.Line;
  trailPositions: number[];
  velocityArrow: THREE.ArrowHelper;
  forceArrow: THREE.ArrowHelper;
  force: number[];
  seeds: { x: number; y: number; z: number };
};

const AGENT_COUNT = 3;
const TRAIL_POINTS = 90;
const PLAY_BOUNDS: Bounds3 = {
  x: { min: -11, max: 11 },
  y: { min: -5, max: 9 },
  z: { min: -11, max: 11 },
};
const WORLD: Record<string, unknown> = {};

const colors = {
  bg: 0x11151f,
  grid: 0x6b7280,
  agent: 0x4dd8a8,
  agentAlt: 0x75a7ff,
  target: 0xffc857,
  source: 0xff5c7c,
  velocity: 0x75a7ff,
  force: 0xff5c7c,
  trail: 0x8bd7ff,
};

const directionMap: Record<string, number[]> = {
  x: [1, 0, 0],
  '-x': [-1, 0, 0],
  y: [0, 1, 0],
  '-y': [0, -1, 0],
  z: [0, 0, 1],
  '-z': [0, 0, -1],
};

const falloffControls: Control[] = [
  { type: 'options', id: 'falloff', value: 'constant', options: { constant: 'constant', linear: 'linear', invSquare: 'invSquare', arrive: 'arrive', exponential: 'exponential' } },
  { id: 'k', value: 8, min: 0.1, max: 40, step: 0.1 },
  { id: 'eps', value: 0.05, min: 0.001, max: 1, step: 0.001 },
  { id: 'slowR', label: 'slow r', value: 2.4, min: 0.1, max: 8, step: 0.1 },
  { id: 'rate', value: 0.7, min: 0, max: 4, step: 0.05 },
  { id: 'maxR', label: 'max r', value: 0, min: 0, max: 8, step: 0.1 },
  { id: 'minR', label: 'min r', value: 0, min: 0, max: 4, step: 0.1 },
  { id: 'markerY', label: 'marker y', folder: 'Marker', value: 0.5, min: -2, max: 4, step: 0.1 },
];

const modes: Mode[] = [
  {
    value: 'attract',
    label: 'attract',
    marker: 'target',
    controls: cloneControls(falloffControls),
    buildForces: (_entry, values) => [
      forces.attract(() => markerPosition(targetMarker), makeFalloff(values)),
    ],
  },
  {
    value: 'repel',
    label: 'repel',
    marker: 'source',
    controls: cloneControls(falloffControls, { maxR: 3.8 }),
    buildForces: (_entry, values) => [
      forces.repel(() => markerPosition(sourceMarker), makeFalloff(values)),
    ],
  },
  {
    value: 'damp',
    label: 'damp',
    controls: [
      { id: 'coefficient', value: 1.2, min: 0, max: 8, step: 0.1 },
    ],
    initialVelocity: (index) => [
      [3, 1.2, -1.5],
      [-2.5, 0.5, 1.2],
      [1.4, -0.8, 2.6],
    ][index] as [number, number, number],
    buildForces: (_entry, values) => [
      forces.damp(values.coefficient as number),
    ],
  },
  {
    value: 'drift',
    label: 'drift',
    controls: [
      { id: 'strength', value: 3.5, min: 0, max: 16, step: 0.1 },
      { id: 'scale', value: 0.45, min: 0.05, max: 2, step: 0.05 },
      { type: 'boolean', id: 'x', label: 'x axis', value: true },
      { type: 'boolean', id: 'y', label: 'y axis', value: true },
      { type: 'boolean', id: 'z', label: 'z axis', value: true },
      { id: 'damp', value: 1.8, min: 0, max: 8, step: 0.1 },
    ],
    buildForces: (entry, values) => [
      forces.drift({
        strength: values.strength as number,
        scale: values.scale as number,
        x: values.x ? { seed: entry.seeds.x } : false,
        y: values.y ? { seed: entry.seeds.y } : false,
        z: values.z ? { seed: entry.seeds.z } : false,
      }),
      forces.damp(values.damp as number),
    ],
  },
  {
    value: 'oscillate',
    label: 'oscillate',
    controls: [
      { type: 'options', id: 'direction', value: 'y', options: { x: 'x', '-x': '-x', y: 'y', '-y': '-y', z: 'z', '-z': '-z' } },
      { id: 'amplitude', value: 3.2, min: 0, max: 16, step: 0.1 },
      { id: 'freq', value: 0.5, min: 0, max: 2, step: 0.05 },
      { id: 'phase', value: 0, min: 0, max: Math.PI * 2, step: 0.1 },
    ],
    buildForces: (_entry, values) => [
      forces.oscillate(
        directionMap[values.direction as string],
        values.amplitude as number,
        values.freq as number,
        values.phase as number,
      ),
    ],
  },
  {
    value: 'constant',
    label: 'constant',
    controls: [
      { id: 'vecX', label: 'vec x', value: 2, min: -10, max: 10, step: 0.1 },
      { id: 'vecY', label: 'vec y', value: 0, min: -10, max: 10, step: 0.1 },
      { id: 'vecZ', label: 'vec z', value: 0, min: -10, max: 10, step: 0.1 },
    ],
    buildForces: (_entry, values) => [
      forces.constant([values.vecX as number, values.vecY as number, values.vecZ as number]),
    ],
  },
  {
    value: 'tangentialAround',
    label: 'tangentialAround',
    controls: [
      { id: 'k', value: 4, min: 0, max: 24, step: 0.2 },
      { id: 'axisX', label: 'axis x', value: 0, min: -1, max: 1, step: 0.1 },
      { id: 'axisY', label: 'axis y', value: 1, min: -1, max: 1, step: 0.1 },
      { id: 'axisZ', label: 'axis z', value: 0, min: -1, max: 1, step: 0.1 },
    ],
    initialVelocity: (index) => [
      [3, 0, 0],
      [0, 0, 3],
      [-2.2, 0, 2.2],
    ][index] as [number, number, number],
    buildForces: (_entry, values) => [
      forces.tangentialAround(
        [values.axisX as number, values.axisY as number, values.axisZ as number],
        values.k as number,
      ),
    ],
  },
];

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
mountDemoChrome('three');

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

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const dragPoint = new THREE.Vector3();
const dragOffset = new THREE.Vector3();
let draggedMarker: THREE.Object3D | undefined;

let activeMode = modes[0];
let values = controlsToValues(activeMode.controls);
let entries: AgentEntry[] = [];
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
  pane = new Pane({ title: '3D Forces', expanded: true, container: paneContainer });

  const modeProxy = { mode: activeMode.value };
  pane.addBinding(modeProxy, 'mode', {
    label: 'mode',
    options: Object.fromEntries(modes.map((mode) => [mode.label, mode.value])),
  }).on('change', (ev) => {
    const nextMode = modes.find((mode) => mode.value === ev.value);
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
        applyMarkerHeight();
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
  applyMarkerHeight();
  showActiveMarker();

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
    const entry: AgentEntry = {
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
    activeMode.buildForces(entry, values).forEach((force) => {
      entry.agent.add(force, { label: activeMode.value });
    });
  });
}

function syncEntryVisuals(entry: AgentEntry): void {
  const [x, y, z] = entry.agent.position;
  entry.mesh.position.set(x, y, z);
  addTrailPoint(entry);
  updateTrail(entry);
  updateArrow(entry.velocityArrow, entry.agent.position, entry.agent.velocity, 0.22, 1.5);
  updateArrow(entry.forceArrow, entry.agent.position, entry.force, 0.08, 1.4);
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

function applyMarkerHeight(): void {
  const markerY = typeof values.markerY === 'number' ? values.markerY : 0.5;
  targetMarker.position.y = markerY;
  sourceMarker.position.y = markerY;
}

function showActiveMarker(): void {
  targetMarker.visible = activeMode.marker === 'target';
  sourceMarker.visible = activeMode.marker === 'source';
}

function createAgentMesh(index: number): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.16, 24, 16);
  const material = new THREE.MeshStandardMaterial({
    color: index % 2 === 0 ? colors.agent : colors.agentAlt,
    roughness: 0.42,
    metalness: 0.05,
    emissive: 0x07120f,
  });
  return new THREE.Mesh(geometry, material);
}

function createMarker(color: number): THREE.Group {
  const group = new THREE.Group();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 24, 16),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 }),
  );
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.015, 8, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }),
  );
  ring.rotation.x = Math.PI / 2;
  group.add(sphere, ring);
  return group;
}

function createTrail(): THREE.Line {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
  const material = new THREE.LineBasicMaterial({
    color: colors.trail,
    transparent: true,
    opacity: 0.45,
  });
  return new THREE.Line(geometry, material);
}

function addTrailPoint(entry: AgentEntry): void {
  const p = entry.agent.position;
  const lastIndex = entry.trailPositions.length - 3;
  const last = lastIndex >= 0
    ? [entry.trailPositions[lastIndex], entry.trailPositions[lastIndex + 1], entry.trailPositions[lastIndex + 2]]
    : undefined;

  if (!last || distance3(last, p) > 0.08) {
    entry.trailPositions.push(p[0], p[1], p[2]);
    while (entry.trailPositions.length > TRAIL_POINTS * 3) entry.trailPositions.splice(0, 3);
  }
}

function updateTrail(entry: AgentEntry): void {
  entry.trail.geometry.dispose();
  entry.trail.geometry = new THREE.BufferGeometry();
  entry.trail.geometry.setAttribute('position', new THREE.Float32BufferAttribute(entry.trailPositions, 3));
}

function updateArrow(
  arrow: THREE.ArrowHelper,
  origin: number[],
  vector: number[],
  scale: number,
  maxLength: number,
): void {
  const v = new THREE.Vector3(vector[0], vector[1], vector[2]);
  const len = v.length();
  arrow.position.set(origin[0], origin[1], origin[2]);

  if (len < 0.001) {
    arrow.visible = false;
    return;
  }

  arrow.visible = true;
  v.normalize();
  arrow.setDirection(v);
  arrow.setLength(Math.min(len * scale, maxLength), 0.16, 0.08);
}

function markerPosition(marker: THREE.Object3D): number[] {
  return [marker.position.x, marker.position.y, marker.position.z];
}

function makeFalloff(controlValues: ControlValues): FalloffFn {
  const kind = controlValues.falloff as string;
  const k = controlValues.k as number;
  let fn: FalloffFn;

  if (kind === 'linear') {
    fn = falloff.linear(k);
  } else if (kind === 'invSquare') {
    fn = falloff.invSquare(k, controlValues.eps as number);
  } else if (kind === 'arrive') {
    fn = falloff.arrive(k, controlValues.slowR as number);
  } else if (kind === 'exponential') {
    fn = falloff.exponential(k, controlValues.rate as number);
  } else {
    fn = falloff.constant(k);
  }

  const maxR = controlValues.maxR as number;
  const minR = controlValues.minR as number;
  if (minR > 0) fn = falloff.beyond(fn, minR);
  if (maxR > 0) fn = falloff.within(fn, maxR);
  return fn;
}

function controlsToValues(controls: Control[]): ControlValues {
  return Object.fromEntries(controls.map((control) => [control.id, control.value]));
}

function groupControlsByFolder(controls: Control[], fallbackTitle: string): Map<string, Control[]> {
  const grouped = new Map<string, Control[]>();
  controls.forEach((control) => {
    const title = control.folder ?? fallbackTitle;
    grouped.set(title, [...(grouped.get(title) ?? []), control]);
  });
  return grouped;
}

function cloneControls(controls: Control[], overrides: Record<string, number | boolean | string> = {}): Control[] {
  return controls.map((control) => ({
    ...control,
    value: overrides[control.id] ?? control.value,
  }) as Control);
}

function distance3(a: number[], b: number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
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
