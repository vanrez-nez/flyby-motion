import * as PIXI from 'pixi.js';
import {
  Agent,
  falloff,
  forces,
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

const app = new PIXI.Application();
await app.init({
  backgroundColor: demoColors.bg,
  antialias: true,
  resizeTo: window,
});

const mount = document.querySelector<HTMLDivElement>('#app');
if (!mount) throw new Error('Missing #app mount');
mount.appendChild(app.canvas);
mountDemoChrome('repel');

const world: Record<string, unknown> = {};
const center = (): [number, number] => [
  app.screen.width * 0.5,
  app.screen.height * 0.5,
];
const threat = { x: app.screen.width * 0.5, y: app.screen.height * 0.5 };

const AGENT_COUNT = 12;
const AGENT_STYLE = {
  radius: 10,
  stroke: 0xffffff,
  strokeWidth: 2,
  dotRadius: 2.5,
  dotColor: 0xffffff,
};

const agents: Array<{
  agent: Agent;
  graphics: PIXI.Graphics;
  trailLayer: PIXI.Graphics;
  trailPoints: number[][];
  force: number[];
  color: number;
}> = [];

const root = new PIXI.Container();
const threatGraphics = new PIXI.Graphics();
root.addChild(threatGraphics);
app.stage.addChild(root);

// --- Spawn agents ---
for (let i = 0; i < AGENT_COUNT; i++) {
  const trailLayer = new PIXI.Graphics();
  const graphics = new PIXI.Graphics();
  const color = demoColors.agent;

  const [cx, cy] = center();
  const angle = Math.random() * Math.PI * 2;
  const dist = 100 + Math.random() * 200;
  const agent = new Agent({
    position: [cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist],
    velocity: [0, 0],
    mass: 1,
    maxSpeed: 800,
    maxForce: 3000,
  });

  const entry = {
    agent,
    graphics,
    trailLayer,
    trailPoints: [],
    force: [0, 0],
    color,
  };

  agents.push(entry);

  agent.on('force:applied', (f) => {
    entry.force = f as number[];
  });

  root.addChild(trailLayer, graphics);
}

// --- Threat interaction ---
let draggingThreat = false;
app.stage.eventMode = 'static';
app.stage.hitArea = app.screen;
app.stage.on('pointerdown', (event) => {
  draggingThreat = true;
  moveThreat(event.global.x, event.global.y);
});
app.stage.on('pointermove', (event) => {
  if (draggingThreat) moveThreat(event.global.x, event.global.y);
});
app.stage.on('pointerup', () => { draggingThreat = false; });
app.stage.on('pointerupoutside', () => { draggingThreat = false; });

window.addEventListener('resize', () => {
  app.stage.hitArea = app.screen;
});

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'r') resetAgents();
});

// --- Tweakpane ---
const tpContainer = document.createElement('div');
tpContainer.style.position = 'absolute';
tpContainer.style.top = '44px';
tpContainer.style.left = '12px';
tpContainer.style.zIndex = '10';
mount.appendChild(tpContainer);

const pane = new Pane({ title: 'Settings', expanded: true, container: tpContainer });

const modeProxy = { mode: 'repel' as 'repel' | 'flee' };
const modeBinding = pane.addBinding(modeProxy, 'mode', {
  label: 'mode',
  options: {
    Repel: 'repel',
    Flee: 'flee',
  },
});

const ctrlFolder = pane.addFolder({ title: 'Force' });

const strengthBinding = ctrlFolder.addBinding({ strength: 1800 }, 'strength', {
  min: 200, max: 5000, step: 50, label: 'strength',
});

const dampBinding = ctrlFolder.addBinding({ damp: 1.5 }, 'damp', {
  min: 0, max: 8, step: 0.1, label: 'damping',
});

const threatRadBinding = ctrlFolder.addBinding({ radius: 280 }, 'radius', {
  min: 60, max: 600, step: 5, label: 'threat radius',
});

pane.addButton({ title: 'Reset' }).on('click', () => resetAgents());

// --- State ---
let ctrlStrength = 1800;
let ctrlDamp = 1.5;
let ctrlMode: 'repel' | 'flee' = 'repel';
let ctrlThreatRadius = 280;
let t = 0;

strengthBinding.on('change', (ev) => {
  ctrlStrength = ev.value;
  rebuildForces();
});

dampBinding.on('change', (ev) => {
  ctrlDamp = ev.value;
  rebuildForces();
});

threatRadBinding.on('change', (ev) => {
  ctrlThreatRadius = ev.value;
});

modeBinding.on('change', (ev) => {
  ctrlMode = ev.value;
  rebuildForces();
  updateModeControls();
});

updateModeControls();

function rebuildForces(): void {
  agents.forEach(({ agent }, i) => {
    agent.clear();
    const sourceFn = () => [threat.x, threat.y] as [number, number];
    const threatMagnitude = falloff.within(falloff.constant(ctrlStrength), ctrlThreatRadius);

    if (ctrlMode === 'repel') {
      agent.add(
        forces.repel(sourceFn, threatMagnitude),
        { label: 'repel' },
      );
      agents[i].color = demoColors.agent;
    } else {
      agent.add(
        forces.repel(sourceFn, threatMagnitude),
        { label: 'flee' },
      );
      agent.add(forces.damp(ctrlDamp), { label: 'damp' });
      agents[i].color = demoColors.agentAlt;
    }
  });
}

function updateModeControls(): void {
  dampBinding.hidden = ctrlMode !== 'flee';
}

function resetAgents(): void {
  const [cx, cy] = center();
  agents.forEach(({ agent, trailPoints, graphics, trailLayer }) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 100 + Math.random() * 200;
    agent.position[0] = cx + Math.cos(angle) * dist;
    agent.position[1] = cy + Math.sin(angle) * dist;
    agent.velocity[0] = 0;
    agent.velocity[1] = 0;
    trailPoints.length = 0;
    trailLayer.clear();
    graphics.clear();
  });
}

function moveThreat(x: number, y: number): void {
  threat.x = x;
  threat.y = y;
}

rebuildForces();
resetAgents();

app.ticker.add((ticker) => {
  const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
  t += dt;

  agents.forEach((entry) => {
    const { agent, trailPoints } = entry;
    step(agent, world, t, dt);
    if (wrapAgentToViewport(agent)) {
      trailPoints.length = 0;
    }
  });

  drawThreat();
  agents.forEach((entry) => {
    addTrailPoint(entry);
    drawAgent(entry);
  });
});

function drawThreat(): void {
  const g = threatGraphics;
  g.clear();

  drawRadiusRing(g, threat.x, threat.y, ctrlThreatRadius, demoColors.force);
  drawMarker(g, threat.x, threat.y, demoColors.force);
}

function drawAgent(entry: typeof agents[0]): void {
  const { agent, graphics, trailLayer, trailPoints, color } = entry;
  const g = graphics;
  g.clear();
  trailLayer.clear();

  drawAgentDot(g, agent.position, { ...AGENT_STYLE, fill: color });
  drawMotionVectors(g, agent.position, AGENT_STYLE.radius, agent.velocity, entry.force);
  drawTrail(trailLayer, trailPoints);
}

function addTrailPoint(entry: typeof agents[0]): void {
  const { trailPoints, agent } = entry;
  const last = trailPoints[trailPoints.length - 1];
  if (!last || distance(last, agent.position) > 4) {
    trailPoints.push([...agent.position]);
    if (trailPoints.length > 70) trailPoints.shift();
  }
}

function wrapAgentToViewport(agent: Agent): boolean {
  const margin = AGENT_STYLE.radius;
  const width = app.screen.width;
  const height = app.screen.height;
  let wrapped = false;

  if (agent.position[0] < -margin) {
    agent.position[0] = width + margin;
    wrapped = true;
  } else if (agent.position[0] > width + margin) {
    agent.position[0] = -margin;
    wrapped = true;
  }

  if (agent.position[1] < -margin) {
    agent.position[1] = height + margin;
    wrapped = true;
  } else if (agent.position[1] > height + margin) {
    agent.position[1] = -margin;
    wrapped = true;
  }

  return wrapped;
}

function distance(a: number[], b: number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
