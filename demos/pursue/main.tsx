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
mountDemoChrome('pursue');

const world: Record<string, unknown> = {};
const center = (): [number, number] => [
  app.screen.width * 0.5,
  app.screen.height * 0.5,
];

const PURSUER_COUNT = 3;
const LEADER_STYLE = {
  radius: 13,
  fill: demoColors.target,
  stroke: 0xffffff,
  strokeWidth: 2,
  dotRadius: 3,
  dotColor: 0xffffff,
};
const PURSUER_STYLE = {
  radius: 10,
  fill: demoColors.agent,
  stroke: 0xffffff,
  strokeWidth: 2,
  dotRadius: 2.5,
  dotColor: 0xffffff,
};

const leader = new Agent({
  position: center(),
  velocity: [0, 0],
  mass: 1,
  maxSpeed: 900,
  maxForce: 2200,
});

const pursuers: Array<{
  agent: Agent;
  graphics: PIXI.Graphics;
  trailLayer: PIXI.Graphics;
  trailPoints: number[][];
  force: number[];
}> = [];

const root = new PIXI.Container();
const leaderLayer = new PIXI.Graphics();
const predictionLayer = new PIXI.Graphics();
const leaderTrailLayer = new PIXI.Graphics();
app.stage.addChild(root);
root.addChild(leaderTrailLayer, predictionLayer, leaderLayer);

const leaderTrailPoints: number[][] = [];

for (let i = 0; i < PURSUER_COUNT; i++) {
  const graphics = new PIXI.Graphics();
  const trailLayer = new PIXI.Graphics();
  const agent = new Agent({
    position: [0, 0],
    velocity: [0, 0],
    mass: 1,
    maxSpeed: 820,
    maxForce: 2600,
  });

  const entry = {
    agent,
    graphics,
    trailLayer,
    trailPoints: [],
    force: [0, 0],
  };

  pursuers.push(entry);

  agent.on('force:applied', (force) => {
    entry.force = force as number[];
  });

  root.addChild(trailLayer, graphics);
}

let ctrlStrength = 900;
let ctrlSlowRadius = 180;
let ctrlDamping = 1.3;
let ctrlLookahead = 0.45;
let ctrlLeaderSpeed = 220;
let t = 0;

window.addEventListener('resize', () => {
  app.stage.hitArea = app.screen;
});

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'r') resetAgents();
});

app.stage.eventMode = 'static';
app.stage.hitArea = app.screen;

const tpContainer = document.createElement('div');
tpContainer.style.position = 'absolute';
tpContainer.style.top = '44px';
tpContainer.style.left = '12px';
tpContainer.style.zIndex = '10';
mount.appendChild(tpContainer);

const pane = new Pane({ title: 'Settings', expanded: true, container: tpContainer });
const forceFolder = pane.addFolder({ title: 'Force' });

const strengthBinding = forceFolder.addBinding({ strength: ctrlStrength }, 'strength', {
  min: 100, max: 2400, step: 25, label: 'strength',
});
strengthBinding.on('change', (ev) => {
  ctrlStrength = ev.value;
  rebuildForces();
});

const slowRadiusBinding = forceFolder.addBinding({ slowRadius: ctrlSlowRadius }, 'slowRadius', {
  min: 40, max: 420, step: 5, label: 'slow radius',
});
slowRadiusBinding.on('change', (ev) => {
  ctrlSlowRadius = ev.value;
  rebuildForces();
});

const dampingBinding = forceFolder.addBinding({ damping: ctrlDamping }, 'damping', {
  min: 0, max: 8, step: 0.1, label: 'damping',
});
dampingBinding.on('change', (ev) => {
  ctrlDamping = ev.value;
  rebuildForces();
});

const lookaheadBinding = forceFolder.addBinding({ lookahead: ctrlLookahead }, 'lookahead', {
  min: 0, max: 1.5, step: 0.05, label: 'lookahead',
});
lookaheadBinding.on('change', (ev) => {
  ctrlLookahead = ev.value;
  rebuildForces();
});

const leaderBinding = pane.addBinding({ leaderSpeed: ctrlLeaderSpeed }, 'leaderSpeed', {
  min: 40, max: 520, step: 10, label: 'leader speed',
});
leaderBinding.on('change', (ev) => {
  ctrlLeaderSpeed = ev.value;
});

pane.addButton({ title: 'Reset' }).on('click', () => resetAgents());

rebuildForces();
resetAgents();

app.ticker.add((ticker) => {
  const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
  t += dt;

  updateLeader(t);
  addTrailPoint(leaderTrailPoints, leader.position, 5, 120);

  pursuers.forEach((entry) => {
    step(entry.agent, world, t, dt);
    addTrailPoint(entry.trailPoints, entry.agent.position, 5, 100);
    drawPursuer(entry);
  });

  drawLeader();
  drawPrediction();
});

function rebuildForces(): void {
  pursuers.forEach(({ agent }) => {
    agent.clear();
    agent.add(
      behaviors.pursue(
        () => ({
          position: leader.position,
          velocity: leader.velocity,
        }),
        {
          strength: ctrlStrength,
          slowR: ctrlSlowRadius,
          damp: ctrlDamping,
          lookahead: ctrlLookahead,
        },
      ),
      { label: 'pursue' },
    );
  });
}

function resetAgents(): void {
  const [cx, cy] = center();
  leader.position[0] = cx;
  leader.position[1] = cy;
  leader.velocity[0] = ctrlLeaderSpeed;
  leader.velocity[1] = 0;
  leaderTrailPoints.length = 0;

  pursuers.forEach(({ agent, trailPoints, graphics, trailLayer }, i) => {
    const angle = (i / pursuers.length) * Math.PI * 2 + Math.PI;
    agent.position[0] = cx + Math.cos(angle) * 260;
    agent.position[1] = cy + Math.sin(angle) * 180;
    agent.velocity[0] = 0;
    agent.velocity[1] = 0;
    trailPoints.length = 0;
    trailLayer.clear();
    graphics.clear();
  });
}

function updateLeader(time: number): void {
  const [cx, cy] = center();
  const xRadius = Math.max(120, app.screen.width * 0.28);
  const yRadius = Math.max(90, app.screen.height * 0.22);
  const speedScale = ctrlLeaderSpeed / 220;
  const phase = time * speedScale * 0.75;
  const nextX = cx + Math.cos(phase) * xRadius;
  const nextY = cy + Math.sin(phase * 1.7) * yRadius;

  leader.velocity[0] = (nextX - leader.position[0]) * 5;
  leader.velocity[1] = (nextY - leader.position[1]) * 5;
  leader.position[0] = nextX;
  leader.position[1] = nextY;
}

function drawLeader(): void {
  leaderLayer.clear();
  leaderTrailLayer.clear();

  drawTrail(leaderTrailLayer, leaderTrailPoints, {
    color: demoColors.target,
    width: 2,
    maxAlpha: 0.35,
  });
  drawAgentDot(leaderLayer, leader.position, LEADER_STYLE);
}

function drawPrediction(): void {
  const predicted = predictedLeaderPosition();
  predictionLayer.clear();

  predictionLayer
    .moveTo(leader.position[0], leader.position[1])
    .lineTo(predicted[0], predicted[1])
    .stroke({ color: demoColors.target, width: 2, alpha: 0.35 });

  drawMarker(predictionLayer, predicted[0], predicted[1], demoColors.target);
}

function drawPursuer(entry: typeof pursuers[0]): void {
  const { agent, graphics, trailLayer, trailPoints } = entry;
  graphics.clear();
  trailLayer.clear();

  drawAgentDot(graphics, agent.position, PURSUER_STYLE);
  drawMotionVectors(graphics, agent.position, PURSUER_STYLE.radius, agent.velocity, entry.force);
  drawTrail(trailLayer, trailPoints);
}

function predictedLeaderPosition(): [number, number] {
  return [
    leader.position[0] + leader.velocity[0] * ctrlLookahead,
    leader.position[1] + leader.velocity[1] * ctrlLookahead,
  ];
}

function addTrailPoint(
  trailPoints: number[][],
  position: number[],
  spacing: number,
  maxPoints: number,
): void {
  const last = trailPoints[trailPoints.length - 1];
  if (!last || distance(last, position) > spacing) {
    trailPoints.push([...position]);
    if (trailPoints.length > maxPoints) trailPoints.shift();
  }
}

function distance(a: number[], b: number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
