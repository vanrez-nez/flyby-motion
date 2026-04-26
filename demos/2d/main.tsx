import * as PIXI from 'pixi.js';
import { createRoot } from 'react-dom/client';
import {
  Agent,
  adapters,
  compositions,
  mag,
  primitives,
  step,
} from '../../src/index';
import { DemoSidebar, type SidebarControl, type SidebarMetric } from '../shared/DemoSidebar';

type Mode = 'arrive' | 'attract';

interface ControlState {
  strength: number;
  slowRadius: number;
  damping: number;
}

const colors = {
  bg: 0x11151f,
  target: 0xffc857,
  agent: 0x4dd8a8,
  force: 0xff5c7c,
  velocity: 0x75a7ff,
  trail: 0x8bd7ff,
  slowRing: 0xffc857,
};

const app = new PIXI.Application();
await app.init({
  backgroundColor: colors.bg,
  antialias: true,
  resizeTo: window,
});

const mount = document.querySelector<HTMLDivElement>('#app');
if (!mount) throw new Error('Missing #app mount');
mount.appendChild(app.canvas);

const sidebarMount = document.createElement('div');
sidebarMount.id = 'demo-controls';
mount.appendChild(sidebarMount);
const sidebarRoot = createRoot(sidebarMount);

const world: Record<string, unknown> = {};
const target = { x: app.screen.width * 0.68, y: app.screen.height * 0.48 };
const initialPosition = () => [app.screen.width * 0.24, app.screen.height * 0.56];

let mode: Mode = 'arrive';
let controls: ControlState = {
  strength: 1400,
  slowRadius: 280,
  damping: 4,
};
let metrics: SidebarMetric[] = [];
let t = 0;
let lastForce = [0, 0];
let draggingTarget = false;
let lastSidebarRender = 0;

const trailPoints: number[][] = [];
const root = new PIXI.Container();
const trailLayer = new PIXI.Graphics();
const vectorLayer = new PIXI.Graphics();
const radiusLayer = new PIXI.Graphics();

app.stage.addChild(root);
root.addChild(trailLayer, radiusLayer, vectorLayer);

const agent = new Agent({
  position: initialPosition(),
  velocity: [0, 0],
  mass: 1,
  maxSpeed: 1100,
  maxForce: 3000,
});

const agentBody = new PIXI.Graphics()
  .circle(0, 0, 16)
  .fill(colors.agent)
  .circle(5, -5, 4)
  .fill(0xffffff);
root.addChild(agentBody);
const syncAgent = adapters.syncPixi(agent, agentBody);

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
metrics = buildMetrics();
renderSidebar();

app.ticker.add((ticker) => {
  const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
  t += dt;

  step(agent, world, t, dt);
  constrainAgent();
  addTrailPoint();
  drawScene();
  updateMetrics();
});

function renderSidebar(): void {
  sidebarRoot.render(
    <DemoSidebar
      title="flyby-motion / arrive"
      subtitle="Drag the target and compare controlled arrival against raw attraction."
      modes={[
        { value: 'arrive', label: 'Arrive' },
        { value: 'attract', label: 'Raw attract' },
      ]}
      activeMode={mode}
      onModeChange={setMode}
      controls={sidebarControls()}
      onControlChange={setControl}
      metrics={metrics}
      actions={[{ label: 'Reset', onClick: resetAgent }]}
      hint="Velocity is blue. Total force is red. Press R to reset."
    />,
  );
}

function sidebarControls(): SidebarControl[] {
  const arriveOnly = mode !== 'arrive';
  return [
    { id: 'strength', label: 'strength', value: controls.strength, min: 100, max: 2400, step: 25 },
    {
      id: 'slowRadius',
      label: 'slow radius',
      value: controls.slowRadius,
      min: 80,
      max: 520,
      step: 5,
      disabled: arriveOnly,
    },
    {
      id: 'damping',
      label: 'damping',
      value: controls.damping,
      min: 0,
      max: 12,
      step: 0.1,
      disabled: arriveOnly,
    },
  ];
}

function setMode(nextMode: Mode): void {
  mode = nextMode;
  rebuildContributor();
  renderSidebar();
}

function setControl(id: string, value: number): void {
  if (!(id in controls)) return;
  controls = { ...controls, [id]: value };
  rebuildContributor();
  renderSidebar();
}

function updateMetrics(): void {
  if (t - lastSidebarRender < 0.08) return;
  lastSidebarRender = t;
  metrics = buildMetrics();
  renderSidebar();
}

function buildMetrics(): SidebarMetric[] {
  return [
    { label: 'speed', value: Math.hypot(agent.velocity[0], agent.velocity[1]).toFixed(1) },
    { label: 'force', value: Math.hypot(lastForce[0], lastForce[1]).toFixed(1) },
    { label: 'distance', value: distance(agent.position, [target.x, target.y]).toFixed(1) },
    { label: 'object', value: formatPoint(agent.position) },
    { label: 'target', value: formatPoint([target.x, target.y]) },
  ];
}

function rebuildContributor(): void {
  agent.clear();
  const targetFn = () => [target.x, target.y];

  if (mode === 'arrive') {
    agent.add(compositions.arrive(targetFn, {
      k: controls.strength,
      slowR: controls.slowRadius,
      damp: controls.damping,
    }), { label: 'arrive' });
  } else {
    agent.add(
      primitives.attract(targetFn, mag.constant(controls.strength)),
      { label: 'raw attract' },
    );
  }
}

function resetAgent(): void {
  const [x, y] = initialPosition();
  agent.position[0] = x;
  agent.position[1] = y;
  agent.velocity[0] = 0;
  agent.velocity[1] = 0;
  lastForce = [0, 0];
  trailPoints.length = 0;
  syncAgent();
  metrics = buildMetrics();
  renderSidebar();
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
  const pad = 18;
  if (agent.position[0] < pad || agent.position[0] > app.screen.width - pad) {
    agent.position[0] = clamp(agent.position[0], pad, app.screen.width - pad);
    agent.velocity[0] *= -0.35;
  }
  if (agent.position[1] < pad || agent.position[1] > app.screen.height - pad) {
    agent.position[1] = clamp(agent.position[1], pad, app.screen.height - pad);
    agent.velocity[1] *= -0.35;
  }
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
  drawTrail();
  drawVectors();
}

function drawTarget(): void {
  radiusLayer.clear();
  if (mode === 'arrive') {
    radiusLayer
      .circle(target.x, target.y, controls.slowRadius)
      .stroke({ color: colors.slowRing, width: 1, alpha: 0.28 });
  }

  targetMarker.clear()
    .circle(target.x, target.y, 18)
    .fill({ color: colors.target, alpha: 0.12 })
    .stroke({ color: colors.target, width: 4, alpha: 0.95 });
}

function drawTrail(): void {
  trailLayer.clear();
  for (let i = 1; i < trailPoints.length; i++) {
    const a = trailPoints[i - 1];
    const b = trailPoints[i];
    trailLayer
      .moveTo(a[0], a[1])
      .lineTo(b[0], b[1])
      .stroke({ color: colors.trail, width: 2, alpha: i / trailPoints.length * 0.45 });
  }
}

function drawVectors(): void {
  vectorLayer.clear();
  drawArrow(vectorLayer, agent.position, agent.velocity, colors.velocity, 0.16, 64);
  drawArrow(vectorLayer, agent.position, lastForce, colors.force, 0.04, 70);
}

function drawArrow(
  graphics: PIXI.Graphics,
  origin: number[],
  vector: number[],
  color: number,
  scale: number,
  maxLength: number,
): void {
  const len = Math.hypot(vector[0], vector[1]);
  if (len < 0.01) return;

  const length = Math.min(len * scale, maxLength);
  const nx = vector[0] / len;
  const ny = vector[1] / len;
  const endX = origin[0] + nx * length;
  const endY = origin[1] + ny * length;
  const sideX = -ny;
  const sideY = nx;

  graphics
    .moveTo(origin[0], origin[1])
    .lineTo(endX, endY)
    .stroke({ color, width: 3, alpha: 0.9 })
    .moveTo(endX, endY)
    .lineTo(endX - nx * 12 + sideX * 6, endY - ny * 12 + sideY * 6)
    .moveTo(endX, endY)
    .lineTo(endX - nx * 12 - sideX * 6, endY - ny * 12 - sideY * 6)
    .stroke({ color, width: 3, alpha: 0.9 });
}

function distance(a: number[], b: number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function formatPoint(point: number[]): string {
  return `${point[0].toFixed(1)}, ${point[1].toFixed(1)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
