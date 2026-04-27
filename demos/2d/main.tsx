import * as PIXI from 'pixi.js';
import {
  Agent,
  compositions,
  mag,
  primitives,
  step,
} from '../../src/index';
import { Pane } from 'tweakpane';
import {
  demoColors,
  drawAgentDot,
  drawMarker,
  drawMotionVectors,
  drawRadiusRing,
  drawTrail,
} from '../shared/drawables';
import { mountDemoChrome } from '../shared/demoChrome';

type Mode = 'arrive' | 'attract';

const app = new PIXI.Application();
await app.init({
  backgroundColor: demoColors.bg,
  antialias: true,
  resizeTo: window,
});

const mount = document.querySelector<HTMLDivElement>('#app');
if (!mount) throw new Error('Missing #app mount');
mount.appendChild(app.canvas);
mountDemoChrome('arrive');

const world: Record<string, unknown> = {};
const center = (): [number, number] => [
  app.screen.width * 0.5,
  app.screen.height * 0.5,
];
const target = { x: app.screen.width * 0.5, y: app.screen.height * 0.5 };

let mode: Mode = 'arrive';
let ctrlStrength = 1400;
let ctrlSlowRadius = 280;
let ctrlDamping = 4;
let t = 0;
let lastForce = [0, 0];
let draggingTarget = false;
let lastSidebarRefresh = 0;

const trailPoints: number[][] = [];
const root = new PIXI.Container();
const trailLayer = new PIXI.Graphics();
const vectorLayer = new PIXI.Graphics();
const radiusLayer = new PIXI.Graphics();

app.stage.addChild(root);
root.addChild(trailLayer, radiusLayer, vectorLayer);

const agentGraphics = new PIXI.Graphics();
root.addChild(agentGraphics);

const AGENT_STYLE = {
  radius: 14,
  fill: demoColors.agent,
  stroke: 0xffffff,
  strokeWidth: 2,
  dotRadius: 3,
  dotColor: 0xffffff,
};

const agent = new Agent({
  position: center(),
  velocity: [0, 0],
  mass: 1,
  maxSpeed: 1100,
  maxForce: 3000,
});

const targetMarker = new PIXI.Graphics();
targetMarker.eventMode = 'static';
targetMarker.cursor = 'grab';
root.addChild(targetMarker);

agent.on('force:applied', (force) => {
  lastForce = force as number[];
});

targetMarker.on('pointerdown', (event) => {
  draggingTarget = true;
  targetMarker.cursor = 'grabbing';
  moveTarget(event.global.x, event.global.y);
});

app.stage.eventMode = 'static';
app.stage.hitArea = app.screen;
app.stage.on('pointerdown', (event) => {
  if (event.target === targetMarker) return;
  moveTarget(event.global.x, event.global.y);
});
app.stage.on('pointermove', (event) => {
  if (draggingTarget) moveTarget(event.global.x, event.global.y);
});
app.stage.on('pointerup', stopDrag);
app.stage.on('pointerupoutside', stopDrag);

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'r') resetAgent();
});

window.addEventListener('resize', () => {
  app.stage.hitArea = app.screen;
  target.x = clamp(target.x, 40, app.screen.width - 40);
  target.y = clamp(target.y, 40, app.screen.height - 40);
});

rebuildContributor();
resetAgent();

const tpContainer = document.createElement('div');
tpContainer.style.position = 'absolute';
tpContainer.style.top = '44px';
tpContainer.style.left = '12px';
tpContainer.style.zIndex = '10';
mount.appendChild(tpContainer);

const pane = new Pane({ title: 'flyby-motion / arrive', expanded: true, container: tpContainer });

// --- Mode control (list binding on a proxy) ---
const modeProxy = { mode: 'arrive' as Mode };
const modeBinding = pane.addBinding(modeProxy, 'mode', {
  label: 'mode',
  options: {
    Arrive: 'arrive',
    'Raw attract': 'attract',
  },
});
modeBinding.on('change', (ev) => {
  setMode(ev.value);
});

// --- Force folder ---
const forceFolder = pane.addFolder({ title: 'Force' });

const strengthBinding = forceFolder.addBinding({ strength: ctrlStrength }, 'strength', {
  min: 100, max: 2400, step: 25, label: 'strength',
});
strengthBinding.on('change', (ev) => {
  ctrlStrength = ev.value;
  rebuildContributor();
});

const slowRadiusBinding = forceFolder.addBinding(
  { slowRadius: ctrlSlowRadius }, 'slowRadius', {
    min: 80, max: 520, step: 5, label: 'slow radius',
  }
);
slowRadiusBinding.on('change', (ev) => {
  ctrlSlowRadius = ev.value;
  rebuildContributor();
});

const dampingBinding = forceFolder.addBinding(
  { damping: ctrlDamping }, 'damping', {
    min: 0, max: 12, step: 0.1, label: 'damping',
  }
);
dampingBinding.on('change', (ev) => {
  ctrlDamping = ev.value;
  rebuildContributor();
});

// --- Metrics monitors ---
const metricsFolder = pane.addFolder({ title: 'Metrics' });

const metricState = {
  speed: '0.0',
  force: '0.0',
  distance: '0.0',
  agentPos: { x: 0, y: 0 },
  targetPos: { x: 0, y: 0 },
};

const speedMonitor = metricsFolder.addBinding(metricState, 'speed', { readonly: true, label: 'speed' });
const forceMonitor = metricsFolder.addBinding(metricState, 'force', { readonly: true, label: 'force' });
const distMonitor = metricsFolder.addBinding(metricState, 'distance', { readonly: true, label: 'distance' });
const agentPosMonitor = metricsFolder.addBinding(metricState, 'agentPos', { label: 'agent', disabled: true });
const targetPosMonitor = metricsFolder.addBinding(metricState, 'targetPos', { label: 'target', disabled: true });

pane.addButton({ title: 'Reset' }).on('click', () => resetAgent());
updateDisabled();

function setMode(nextMode: Mode): void {
  mode = nextMode;
  rebuildContributor();
  updateDisabled();
}

function updateDisabled(): void {
  const arriveOnly = mode !== 'arrive';
  slowRadiusBinding.disabled = arriveOnly;
  dampingBinding.disabled = arriveOnly;
}

app.ticker.add((ticker) => {
  const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
  t += dt;

  step(agent, world, t, dt);
  constrainAgent();
  addTrailPoint();
  drawScene();
  updateMetrics();
});

function updateMetrics(): void {
  if (t - lastSidebarRefresh < 0.08) return;
  lastSidebarRefresh = t;

  metricState.speed = Math.hypot(agent.velocity[0], agent.velocity[1]).toFixed(1);
  metricState.force = Math.hypot(lastForce[0], lastForce[1]).toFixed(1);
  metricState.distance = distance(agent.position, [target.x, target.y]).toFixed(1);
  metricState.agentPos = { x: agent.position[0], y: agent.position[1] };
  metricState.targetPos = { x: target.x, y: target.y };

  speedMonitor.refresh();
  forceMonitor.refresh();
  distMonitor.refresh();
  agentPosMonitor.refresh();
  targetPosMonitor.refresh();
}

function rebuildContributor(): void {
  agent.clear();
  const targetFn = () => [target.x, target.y] as [number, number];

  if (mode === 'arrive') {
    agent.add(
      compositions.arrive(targetFn, {
        k: ctrlStrength,
        slowR: ctrlSlowRadius,
        damp: ctrlDamping,
      }),
      { label: 'arrive' },
    );
  } else {
    agent.add(
      primitives.attract(targetFn, mag.constant(ctrlStrength)),
      { label: 'raw attract' },
    );
  }
}

function resetAgent(): void {
  const [x, y] = center();
  agent.position[0] = x;
  agent.position[1] = y;
  agent.velocity[0] = 0;
  agent.velocity[1] = 0;
  lastForce = [0, 0];
  trailPoints.length = 0;
}

function moveTarget(x: number, y: number): void {
  target.x = clamp(x, 30, app.screen.width - 30);
  target.y = clamp(y, 30, app.screen.height - 30);
}

function stopDrag(): void {
  draggingTarget = false;
  targetMarker.cursor = 'grab';
}

function constrainAgent(): void {
  // Unbounded viewport — agent is free to leave the screen.
}

function addTrailPoint(): void {
  const last = trailPoints[trailPoints.length - 1];
  if (!last || distance(last, agent.position) > 5) {
    trailPoints.push([...agent.position]);
    if (trailPoints.length > 90) trailPoints.shift();
  }
}

function drawScene(): void {
  drawTarget();
  drawTrailLayer();
  drawVectors();
  drawAgent();
}

function drawAgent(): void {
  const g = agentGraphics;
  g.clear();

  drawAgentDot(g, agent.position, AGENT_STYLE);
}

function drawTarget(): void {
  radiusLayer.clear();
  if (mode === 'arrive') {
    drawRadiusRing(radiusLayer, target.x, target.y, ctrlSlowRadius);
  }

  targetMarker
    .clear();
  drawMarker(targetMarker, target.x, target.y, demoColors.target);
}

function drawTrailLayer(): void {
  trailLayer.clear();
  drawTrail(trailLayer, trailPoints);
}

function drawVectors(): void {
  vectorLayer.clear();
  drawMotionVectors(
    vectorLayer,
    agent.position,
    AGENT_STYLE.radius,
    agent.velocity,
    lastForce,
  );
}

function distance(a: number[], b: number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
