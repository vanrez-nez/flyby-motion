import * as PIXI from 'pixi.js';
import {
  Agent,
  behaviors,
  step,
} from '../../src/index';
import { Pane } from 'tweakpane';
import {
  demoColors,
  drawAgentDot,
  drawMarker,
  drawMotionVectors,
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
mountDemoChrome('orbit');

const world: Record<string, unknown> = {};
const center = (): [number, number] => [
  app.screen.width * 0.5,
  app.screen.height * 0.5,
];
const orbitCenter = { x: app.screen.width * 0.5, y: app.screen.height * 0.5 };

const AGENT_COUNT = 3;
const ORBIT_RADIUS = 260;
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
}> = [];

const root = new PIXI.Container();
const guideLayer = new PIXI.Graphics();
const centerMarker = new PIXI.Graphics();
centerMarker.eventMode = 'static';
centerMarker.cursor = 'grab';

app.stage.addChild(root);
root.addChild(guideLayer, centerMarker);

for (let i = 0; i < AGENT_COUNT; i++) {
  const trailLayer = new PIXI.Graphics();
  const graphics = new PIXI.Graphics();
  const agent = new Agent({
    position: [0, 0],
    velocity: [0, 0],
    mass: 1,
    maxSpeed: 900,
    maxForce: 2600,
  });

  const entry = {
    agent,
    graphics,
    trailLayer,
    trailPoints: [],
    force: [0, 0],
  };

  agents.push(entry);

  agent.on('force:applied', (force) => {
    entry.force = force as number[];
  });

  root.addChild(trailLayer, graphics);
}

let ctrlAttraction = 420;
let ctrlTangent = 180;
let ctrlDamping = 0.2;
let draggingCenter = false;
let t = 0;

app.stage.eventMode = 'static';
app.stage.hitArea = app.screen;
app.stage.on('pointerdown', (event) => {
  if (event.target === centerMarker) return;
  moveCenter(event.global.x, event.global.y);
});
app.stage.on('pointermove', (event) => {
  if (draggingCenter) moveCenter(event.global.x, event.global.y);
});
app.stage.on('pointerup', stopDrag);
app.stage.on('pointerupoutside', stopDrag);

centerMarker.on('pointerdown', (event) => {
  draggingCenter = true;
  centerMarker.cursor = 'grabbing';
  moveCenter(event.global.x, event.global.y);
});

window.addEventListener('resize', () => {
  app.stage.hitArea = app.screen;
  orbitCenter.x = clamp(orbitCenter.x, 40, app.screen.width - 40);
  orbitCenter.y = clamp(orbitCenter.y, 40, app.screen.height - 40);
});

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'r') resetAgents();
});

const tpContainer = document.createElement('div');
tpContainer.style.position = 'absolute';
tpContainer.style.top = '44px';
tpContainer.style.left = '12px';
tpContainer.style.zIndex = '10';
mount.appendChild(tpContainer);

const pane = new Pane({ title: 'Settings', expanded: true, container: tpContainer });
const forceFolder = pane.addFolder({ title: 'Force' });

const attractionBinding = forceFolder.addBinding({ attraction: ctrlAttraction }, 'attraction', {
  min: 100, max: 2200, step: 25, label: 'attraction',
});
attractionBinding.on('change', (ev) => {
  ctrlAttraction = ev.value;
  rebuildForces();
});

const tangentBinding = forceFolder.addBinding({ tangent: ctrlTangent }, 'tangent', {
  min: 0, max: 1400, step: 25, label: 'tangent',
});
tangentBinding.on('change', (ev) => {
  ctrlTangent = ev.value;
  rebuildForces();
});

const dampingBinding = forceFolder.addBinding({ damping: ctrlDamping }, 'damping', {
  min: 0, max: 8, step: 0.1, label: 'damping',
});
dampingBinding.on('change', (ev) => {
  ctrlDamping = ev.value;
  rebuildForces();
});

pane.addButton({ title: 'Reset' }).on('click', () => resetAgents());

rebuildForces();
resetAgents();

app.ticker.add((ticker) => {
  const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
  t += dt;

  agents.forEach((entry) => {
    step(entry.agent, world, t, dt);
    addTrailPoint(entry);
    drawAgent(entry);
  });

  drawCenter();
});

function rebuildForces(): void {
  agents.forEach(({ agent }) => {
    agent.clear();
    agent.add(
      behaviors.orbit(
        () => [orbitCenter.x, orbitCenter.y],
        {
          attractK: ctrlAttraction,
          tangentK: ctrlTangent,
          damp: ctrlDamping,
        },
      ),
      { label: 'orbit' },
    );
  });
}

function resetAgents(): void {
  const [cx, cy] = center();
  orbitCenter.x = cx;
  orbitCenter.y = cy;
  const orbitSpeed = idealOrbitSpeed();

  agents.forEach(({ agent, trailPoints, graphics, trailLayer }, i) => {
    const angle = (i / agents.length) * Math.PI * 2;
    const tangentAngle = angle + Math.PI * 0.5;
    agent.position[0] = orbitCenter.x + Math.cos(angle) * ORBIT_RADIUS;
    agent.position[1] = orbitCenter.y + Math.sin(angle) * ORBIT_RADIUS;
    agent.velocity[0] = Math.cos(tangentAngle) * orbitSpeed;
    agent.velocity[1] = Math.sin(tangentAngle) * orbitSpeed;
    trailPoints.length = 0;
    trailLayer.clear();
    graphics.clear();
  });
}

function idealOrbitSpeed(): number {
  return Math.sqrt((ctrlAttraction + ctrlTangent) * ORBIT_RADIUS);
}

function moveCenter(x: number, y: number): void {
  orbitCenter.x = clamp(x, 30, app.screen.width - 30);
  orbitCenter.y = clamp(y, 30, app.screen.height - 30);
}

function stopDrag(): void {
  draggingCenter = false;
  centerMarker.cursor = 'grab';
}

function drawCenter(): void {
  guideLayer.clear();

  centerMarker.clear();
  drawMarker(centerMarker, orbitCenter.x, orbitCenter.y, demoColors.target);
}

function drawAgent(entry: typeof agents[0]): void {
  const { agent, graphics, trailLayer, trailPoints } = entry;
  graphics.clear();
  trailLayer.clear();

  drawAgentDot(graphics, agent.position, { ...AGENT_STYLE, fill: demoColors.agent });
  drawMotionVectors(graphics, agent.position, AGENT_STYLE.radius, agent.velocity, entry.force);
  drawTrail(trailLayer, trailPoints);
}

function addTrailPoint(entry: typeof agents[0]): void {
  const { agent, trailPoints } = entry;
  const last = trailPoints[trailPoints.length - 1];
  if (!last || distance(last, agent.position) > 5) {
    trailPoints.push([...agent.position]);
    if (trailPoints.length > 100) trailPoints.shift();
  }
}

function distance(a: number[], b: number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
