import * as PIXI from 'pixi.js';
import { Pane } from 'tweakpane';
import {
  Agent,
  step,
  Vector2Fn,
  type Force,
} from '../../src/index';
import {
  demoColors,
  drawAgentDot,
  drawMarker,
  drawMotionVectors,
  drawRadiusRing,
  drawTrail,
} from './drawables';
import { mountDemoChrome, type DemoKey } from './demoChrome';
import { stopCanvasPassthrough } from './stopPassthrough';
import './twoDDemo.css';
import './tpTheme.css';

export type DemoControl =
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

export type DemoControlValues = Record<string, number | boolean | string>;

export interface DemoScene {
  target: { x: number; y: number };
  source: { x: number; y: number };
  mouse: { x: number; y: number; active: boolean };
  leader: Agent;
  center: () => [number, number];
  screen: () => { width: number; height: number };
}

export interface DemoAgentEntry {
  agent: Agent;
  force: number[];
}

export interface FeatureMode {
  value: string;
  label: string;
  controls: DemoControl[];
  buildForces: (entry: DemoAgentEntry, scene: DemoScene, values: DemoControlValues) => Force[];
  marker?: 'target' | 'source' | 'leader';
  presentation?: 'attract' | 'reject' | 'none';
  radiusControl?: string;
  trackPointer?: boolean;
  agentCount?: number;
  maxSpeed?: number;
  maxForce?: number;
  initialVelocity?: (index: number, count: number, scene: DemoScene, values: DemoControlValues) => [number, number];
  configureAgent?: (entry: DemoAgentEntry, scene: DemoScene, values: DemoControlValues) => void;
  afterStep?: (entry: DemoAgentEntry, scene: DemoScene, values: DemoControlValues, t: number, dt: number) => void;
  drawOverlay?: (
    graphics: PIXI.Graphics,
    scene: DemoScene,
    values: DemoControlValues,
    t: number,
  ) => void;
}

export interface FeatureDemoConfig {
  active: DemoKey;
  title: string;
  modes: FeatureMode[];
}

const AGENT_STYLE = {
  radius: 10,
  fill: demoColors.agent,
  stroke: 0xffffff,
  strokeWidth: 2,
  dotRadius: 2.5,
  dotColor: 0xffffff,
};

const TRAIL_LIMIT = 95;
const WORLD: Record<string, unknown> = {};

export async function mountFeatureDemo(config: FeatureDemoConfig): Promise<void> {
  const app = new PIXI.Application();

  const mount = document.querySelector<HTMLDivElement>('#app');
  if (!mount) throw new Error('Missing #app mount');
  const playArea = document.querySelector<HTMLDivElement>('#play-area');
  if (!playArea) throw new Error('Missing #play-area element');
  const tpContainer = document.querySelector<HTMLDivElement>('#tp-container');
  if (!tpContainer) throw new Error('Missing #tp-container element');
  stopCanvasPassthrough(tpContainer);

  await app.init({
    backgroundColor: demoColors.bg,
    antialias: true,
    resizeTo: playArea,
  });
  playArea.appendChild(app.canvas);
  mountDemoChrome(config.active);

  const center = (): [number, number] => [
    app.screen.width * 0.5,
    app.screen.height * 0.5,
  ];

  const scene: DemoScene = {
    target: { x: app.screen.width * 0.62, y: app.screen.height * 0.46 },
    source: { x: app.screen.width * 0.5, y: app.screen.height * 0.5 },
    mouse: { x: app.screen.width * 0.5, y: app.screen.height * 0.5, active: false },
    leader: new Agent({ position: center(), velocity: [0, 0], maxSpeed: 900, maxForce: 2400 }),
    center,
    screen: () => ({ width: app.screen.width, height: app.screen.height }),
  };

  const root = new PIXI.Container();
  const overlayLayer = new PIXI.Graphics();
  const markerLayer = new PIXI.Graphics();
  const leaderLayer = new PIXI.Graphics();
  const leaderTrailLayer = new PIXI.Graphics();
  app.stage.addChild(root);
  root.addChild(leaderTrailLayer, overlayLayer, markerLayer, leaderLayer);

  let activeMode = config.modes[0];
  let values = controlsToValues(activeMode.controls);
  let entries: InternalAgentEntry[] = [];
  let leaderTrail: number[][] = [];
  let t = 0;
  let pane: Pane | undefined;

  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;
  // Drags that begin on the sidebar / tweakpane must not pierce into the
  // playground when the cursor passes over the canvas. Track whether the
  // active drag was actually started on the canvas itself.
  let canvasDragActive = false;
  app.stage.on('pointerdown', (event) => {
    canvasDragActive = true;
    updateTrackedPointer(event.global.x, event.global.y);
    moveActiveMarker(event.global.x, event.global.y);
  });
  app.stage.on('pointermove', (event) => {
    if (event.buttons && !canvasDragActive) return;
    updateTrackedPointer(event.global.x, event.global.y);
    if (event.buttons) moveActiveMarker(event.global.x, event.global.y);
  });
  const endCanvasDrag = () => {
    canvasDragActive = false;
  };
  window.addEventListener('pointerup', endCanvasDrag);
  window.addEventListener('pointercancel', endCanvasDrag);
  app.canvas.addEventListener('pointerleave', () => {
    scene.mouse.active = false;
  });

  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'r') reset();
  });

  mountPane();
  reset();

  app.ticker.add((ticker) => {
    const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
    t += dt;

    updateLeader(scene, t, numberValue(values.leaderSpeed, 220));
    addTrailPoint(leaderTrail, scene.leader.position, 5, 120);

    entries.forEach((entry) => {
      step(entry.agent, WORLD, t, dt);
      activeMode.afterStep?.(entry, scene, values, t, dt);
      mirrorAgentAcrossViewport(entry, app.screen.width, app.screen.height);
      addTrailPoint(entry.trailPoints, entry.agent.position, 5, TRAIL_LIMIT);
    });

    draw();
  });

  function mountPane(): void {
    pane?.dispose();
    tpContainer.replaceChildren();
    pane = new Pane({ title: 'Settings', expanded: true, container: tpContainer });

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

    const controlsByFolder = groupControlsByFolder(activeMode.controls, config.title);
    controlsByFolder.forEach((controls, title) => {
      const folder = pane?.addFolder({ title });
      if (!folder) return;

      controls.forEach((control) => {
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
      root.removeChild(entry.trailLayer, entry.graphics);
    });

    entries = [];
    leaderTrail = [];
    t = 0;
    const count = activeMode.agentCount ?? 3;
    const [cx, cy] = center();
    scene.target.x = cx;
    scene.target.y = cy;
    scene.source.x = cx;
    scene.source.y = cy;
    scene.mouse.x = cx;
    scene.mouse.y = cy;
    scene.mouse.active = false;
    scene.leader.position[0] = cx;
    scene.leader.position[1] = cy;
    scene.leader.velocity[0] = numberValue(values.leaderSpeed, 220);
    scene.leader.velocity[1] = 0;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.PI;
      const radius = count === 1 ? 0 : 120;
      const agent = new Agent({
        position: [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius],
        velocity: activeMode.initialVelocity?.(i, count, scene, values) ?? [0, 0],
        mass: 1,
        maxSpeed: activeMode.maxSpeed ?? 860,
        maxForce: activeMode.maxForce ?? 2800,
      });
      const entry: InternalAgentEntry = {
        agent,
        force: [0, 0],
        graphics: new PIXI.Graphics(),
        trailLayer: new PIXI.Graphics(),
        trailPoints: [],
      };
      agent.on('force:applied', (force) => {
        entry.force = force as number[];
      });
      activeMode.configureAgent?.(entry, scene, values);
      root.addChild(entry.trailLayer, entry.graphics);
      entries.push(entry);
    }

    rebuildForces();
    draw();
  }

  function rebuildForces(): void {
    entries.forEach((entry) => {
      entry.agent.clear();
      activeMode.buildForces(entry, scene, values).forEach((force) => {
        entry.agent.add(force, { label: activeMode.value });
      });
    });
  }

  function moveActiveMarker(x: number, y: number): void {
    if (activeMode.trackPointer) return;

    const marker = activeMode.marker ?? 'target';
    if (marker === 'source') {
      scene.source.x = clamp(x, 30, app.screen.width - 30);
      scene.source.y = clamp(y, 30, app.screen.height - 30);
    } else if (marker === 'leader') {
      scene.leader.position[0] = clamp(x, 30, app.screen.width - 30);
      scene.leader.position[1] = clamp(y, 30, app.screen.height - 30);
    } else {
      scene.target.x = clamp(x, 30, app.screen.width - 30);
      scene.target.y = clamp(y, 30, app.screen.height - 30);
    }
  }

  function updateTrackedPointer(x: number, y: number): void {
    if (!activeMode.trackPointer) return;
    scene.mouse.x = clamp(x, 0, app.screen.width);
    scene.mouse.y = clamp(y, 0, app.screen.height);
    scene.mouse.active = true;
  }

  function draw(): void {
    overlayLayer.clear();
    markerLayer.clear();
    leaderLayer.clear();
    leaderTrailLayer.clear();

    drawPresentation(overlayLayer, markerLayer, scene, activeMode, values);
    activeMode.drawOverlay?.(overlayLayer, scene, values, t);

    if (activeMode.marker === 'leader') {
      drawTrail(leaderTrailLayer, leaderTrail, {
        color: demoColors.target,
        width: 2,
        maxAlpha: 0.35,
      });
    }

    entries.forEach((entry, index) => {
      entry.graphics.clear();
      entry.trailLayer.clear();
      const fill = index % 2 === 0 ? demoColors.agent : demoColors.agentAlt;
      drawTrail(entry.trailLayer, entry.trailPoints);
      drawAgentDot(entry.graphics, entry.agent.position, { ...AGENT_STYLE, fill });
      drawMotionVectors(
        entry.graphics,
        entry.agent.position,
        AGENT_STYLE.radius,
        entry.agent.velocity,
        entry.force,
      );
    });
  }
}

interface InternalAgentEntry extends DemoAgentEntry {
  graphics: PIXI.Graphics;
  trailLayer: PIXI.Graphics;
  trailPoints: number[][];
}

function controlsToValues(controls: DemoControl[]): DemoControlValues {
  return Object.fromEntries(controls.map((control) => [control.id, control.value]));
}

function groupControlsByFolder(controls: DemoControl[], fallbackTitle: string): Map<string, DemoControl[]> {
  const grouped = new Map<string, DemoControl[]>();
  controls.forEach((control) => {
    const title = control.folder ?? fallbackTitle;
    grouped.set(title, [...(grouped.get(title) ?? []), control]);
  });
  return grouped;
}


function updateLeader(scene: DemoScene, time: number, leaderSpeed: number): void {
  const [cx, cy] = scene.center();
  const { width, height } = scene.screen();
  const xRadius = Math.max(120, width * 0.28);
  const yRadius = Math.max(90, height * 0.22);
  const speedScale = leaderSpeed / 220;
  const phase = time * speedScale * 0.75;
  const nextX = cx + Math.cos(phase) * xRadius;
  const nextY = cy + Math.sin(phase * 1.7) * yRadius;

  scene.leader.velocity[0] = (nextX - scene.leader.position[0]) * 5;
  scene.leader.velocity[1] = (nextY - scene.leader.position[1]) * 5;
  scene.leader.position[0] = nextX;
  scene.leader.position[1] = nextY;
}

function drawPresentation(
  graphics: PIXI.Graphics,
  markerLayer: PIXI.Graphics,
  scene: DemoScene,
  mode: FeatureMode,
  values: DemoControlValues,
): void {
  if (!mode.presentation || mode.presentation === 'none') return;

  const point = presentationPoint(scene, mode.marker ?? 'target');
  const color = mode.presentation === 'reject' ? demoColors.force : demoColors.target;
  const radius = mode.radiusControl ? optionalNumber(values[mode.radiusControl]) : undefined;

  if (radius) drawRadiusRing(graphics, point[0], point[1], radius, color);
  drawMarker(markerLayer, point[0], point[1], color);
}

function presentationPoint(
  scene: DemoScene,
  marker: 'target' | 'source' | 'leader',
): [number, number] {
  if (marker === 'source') return [scene.source.x, scene.source.y];
  if (marker === 'leader') return [scene.leader.position[0], scene.leader.position[1]];
  return [scene.target.x, scene.target.y];
}

function addTrailPoint(
  points: number[][],
  position: number[],
  spacing: number,
  maxPoints: number,
): void {
  const last = points[points.length - 1];
  if (!last || Vector2Fn.distance(last, position) > spacing) {
    points.push([...position]);
    if (points.length > maxPoints) points.shift();
  }
}

function mirrorAgentAcrossViewport(entry: InternalAgentEntry, width: number, height: number): void {
  const position = entry.agent.position;
  let wrapped = false;

  if (position[0] < 0) {
    position[0] = width + position[0];
    wrapped = true;
  } else if (position[0] > width) {
    position[0] = position[0] - width;
    wrapped = true;
  }

  if (position[1] < 0) {
    position[1] = height + position[1];
    wrapped = true;
  } else if (position[1] > height) {
    position[1] = position[1] - height;
    wrapped = true;
  }

  if (wrapped) {
    entry.trailPoints.length = 0;
  }
}

function clampMarkers(scene: DemoScene, width: number, height: number): void {
  scene.target.x = clamp(scene.target.x, 30, width - 30);
  scene.target.y = clamp(scene.target.y, 30, height - 30);
  scene.source.x = clamp(scene.source.x, 30, width - 30);
  scene.source.y = clamp(scene.source.y, 30, height - 30);
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && value > 0 ? value : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
