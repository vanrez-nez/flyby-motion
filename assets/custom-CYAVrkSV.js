import"./chunk-CilyBKbf.js";import{o as e,y as t}from"./index-Dgcz3RY4.js";import{A as n,M as r,N as i,P as a,_ as o,f as s,g as c,h as l,j as u,m as d,p as f,u as p,v as m,y as h}from"./waitForStableSize-BDPXfWAO.js";import{n as g,r as _,t as v}from"./FeatureDemo2D-D1TpCwVp.js";import{i as y}from"./tpTheme-e_Ux2hwg.js";t();var b=`# Custom

Three small recipes that show how forces, modifiers, and per-agent state combine into expressive motion.

## What to try

- **Idle disturbance** — agents idle around a home point with subtle drift, then flee from your cursor when it gets close.
- **Target capture** — agents hold near the center, but break formation to chase the cursor when it enters the center radius.
- **Keep distance** — agents settle on a ring around your cursor with adjustable stiffness.

Move the cursor in/out of the marked radii to feel the gating thresholds.

## Key snippets

A gated repel that only fires inside a radius:

\`\`\`ts
modifiers.gate(
  (agent) =>
    scene.mouse.active &&
    distance(agent.position, mouse) < radius,
  forces.repel(() => mouse, falloff.constant(strength)),
);
\`\`\`

Per-agent state via \`WeakMap\` (no library hook needed):

\`\`\`ts
const homeByAgent = new WeakMap<Agent, [number, number]>();

configureAgent(entry) {
  homeByAgent.set(entry.agent, [...entry.agent.position]);
}

buildForces(entry) {
  const home = homeByAgent.get(entry.agent)!;
  return [forces.attract(() => home, (d) => d * 1.6)];
}
\`\`\`
`,x=`import React from 'react';
import {
  falloff,
  forces,
  modifiers,
  Vector2Fn,
  type Force,
} from '../../../../../src/index';
import {
  demoColors,
  drawMarker,
  drawRadiusRing,
} from '../../shared/helpers2d';
import { type FeatureMode } from '../../shared/FeatureDemo2D';
import { FeatureDemo2D } from '../../shared/FeatureDemo2D';
import sidebarMarkdown from './info.md?raw';
import sidebarSource from './index.tsx?raw';

const idleHomeByAgent = new WeakMap<object, [number, number]>();
const idleSeedByAgent = new WeakMap<object, { x: number; y: number }>();

const modes: FeatureMode[] = [
  {
    value: 'idleDisturbance',
    label: 'idle disturbance',
    presentation: 'none',
    trackPointer: true,
    agentCount: 1,
    maxSpeed: 700,
    maxForce: 3600,
    controls: [
      {
        type: 'options',
        id: 'idleForce',
        folder: 'Idle',
        value: 'oscillate',
        options: {
          drift: 'drift',
          oscillate: 'oscillate',
        },
      },
      { id: 'idleStrength', folder: 'Idle', value: 420, min: 0, max: 420, step: 5 },
      { id: 'idleScale', folder: 'Idle', value: 0.50, min: 0.05, max: 1.5, step: 0.05 },
      { type: 'boolean', id: 'idleX', label: 'idle x', folder: 'Idle', value: false },
      { type: 'boolean', id: 'idleY', label: 'idle y', folder: 'Idle', value: true },
      { id: 'homeStrength', folder: 'Home', value: 12, min: 0.2, max: 12, step: 0.1 },
      { id: 'damp', folder: 'Home', value: 5.5, min: 0, max: 14, step: 0.1 },
      { id: 'mouseRadius', folder: 'Mouse', value: 180, min: 60, max: 360, step: 5 },
      { id: 'mouseStrength', folder: 'Mouse', value: 1900, min: 0, max: 5200, step: 50 },
      { id: 'agentMass', folder: 'Agent', value: 0.20, min: 0.05, max: 2, step: 0.05 },
    ],
    configureAgent: (entry, _scene, values) => {
      entry.agent.mass = values.agentMass as number;
      idleHomeByAgent.set(entry.agent, [entry.agent.position[0], entry.agent.position[1]]);
      idleSeedByAgent.set(entry.agent, {
        x: Math.random() * 10000,
        y: Math.random() * 10000,
      });
    },
    afterStep: (entry, _scene, values) => {
      entry.agent.mass = values.agentMass as number;
    },
    buildForces: (entry, scene, values) => {
      const home = getIdleHome(entry.agent);
      const mouseRadius = values.mouseRadius as number;
      const mousePoint = () => [scene.mouse.x, scene.mouse.y];
      const mouseActiveForAgent = (agent: { position: number[] }) =>
        scene.mouse.active && Vector2Fn.distance(agent.position, mousePoint()) <= mouseRadius;
      const homeSpring = forces.attract(
        () => home,
        (d) => d * (values.homeStrength as number),
      );
      const mouseRepel = modifiers.gate(
        mouseActiveForAgent,
        forces.repel(mousePoint, falloff.constant(values.mouseStrength as number)),
      );
      const idleX = values.idleX as boolean;
      const idleY = values.idleY as boolean;
      const idleSeeds = getIdleSeeds(entry.agent);
      const idleForce = values.idleForce === 'drift'
        ? forces.drift({
            strength: values.idleStrength as number,
            scale: values.idleScale as number,
            x: idleX ? { seed: idleSeeds.x } : false,
            y: idleY ? { seed: idleSeeds.y } : false,
          })
        : buildOscillateIdleForce(
            values.idleStrength as number,
            values.idleScale as number,
            idleX,
            idleY,
          );

      return [
        modifiers.sum(
          idleForce,
          homeSpring,
          mouseRepel,
          forces.damp(values.damp as number),
        ),
      ];
    },
    drawOverlay: (graphics, scene, values) => {
      const [cx, cy] = scene.center();
      const mouseRadius = values.mouseRadius as number;

      drawMarker(graphics, cx, cy, demoColors.agent);

      if (scene.mouse.active) {
        drawRadiusRing(graphics, scene.mouse.x, scene.mouse.y, mouseRadius, demoColors.force);
        drawMarker(graphics, scene.mouse.x, scene.mouse.y, demoColors.force);
      }
    },
  },
  {
    value: 'targetCapture',
    label: 'target capture',
    presentation: 'none',
    trackPointer: true,
    agentCount: 1,
    maxSpeed: 900,
    maxForce: 3200,
    controls: [
      { id: 'targetRadius', folder: 'Target', value: 150, min: 50, max: 320, step: 5 },
      { id: 'targetStrength', folder: 'Target', value: 3000, min: 500, max: 6000, step: 50 },
      { id: 'targetSlowR', label: 'target slow r', folder: 'Target', value: 50, min: 10, max: 180, step: 5 },
      { id: 'centerRadius', folder: 'Center', value: 150, min: 50, max: 320, step: 5 },
      { id: 'centerStrength', folder: 'Center', value: 1800, min: 300, max: 4200, step: 50 },
      { id: 'damp', folder: 'Agent', value: 5, min: 0, max: 14, step: 0.1 },
      { id: 'agentMass', folder: 'Agent', value: 0.2, min: 0.05, max: 2, step: 0.05 },
    ],
    configureAgent: (entry, _scene, values) => {
      entry.agent.mass = values.agentMass as number;
    },
    afterStep: (entry, _scene, values) => {
      entry.agent.mass = values.agentMass as number;
    },
    buildForces: (_entry, scene, values) => {
      const targetRadius = values.targetRadius as number;
      const centerRadius = values.centerRadius as number;
      const targetPoint = () => [scene.mouse.x, scene.mouse.y];
      const isTargetInsideCenter = () => Vector2Fn.distance(targetPoint(), scene.center()) <= centerRadius;
      const isTargetCaptureActive = (agent: { position: number[] }) =>
        scene.mouse.active &&
        isTargetInsideCenter() &&
        Vector2Fn.distance(agent.position, targetPoint()) <= targetRadius;
      const centerForce = modifiers.gate(
        (agent) => !isTargetCaptureActive(agent),
        forces.attract(
          scene.center,
          falloff.arrive(values.centerStrength as number, centerRadius),
        ),
      );
      const targetForce = modifiers.gate(
        isTargetCaptureActive,
        forces.attract(
          targetPoint,
          falloff.arrive(values.targetStrength as number, values.targetSlowR as number),
        ),
      );

      return [
        modifiers.sum(
          centerForce,
          targetForce,
          forces.damp(values.damp as number),
        ),
      ];
    },
    drawOverlay: (graphics, scene, values) => {
      const [cx, cy] = scene.center();
      const targetRadius = values.targetRadius as number;
      const centerRadius = values.centerRadius as number;

      drawRadiusRing(graphics, cx, cy, centerRadius, demoColors.target);
      drawMarker(graphics, cx, cy, demoColors.target);

      if (scene.mouse.active) {
        drawRadiusRing(graphics, scene.mouse.x, scene.mouse.y, targetRadius, demoColors.force);
        drawMarker(graphics, scene.mouse.x, scene.mouse.y, demoColors.force);
      }
    },
  },
  {
    value: 'keepDistance',
    label: 'keepDistance',
    presentation: 'none',
    trackPointer: true,
    agentCount: 1,
    maxSpeed: 900,
    maxForce: 3200,
    controls: [
      { id: 'desiredRadius', folder: 'Mouse', value: 150, min: 40, max: 360, step: 5 },
      { id: 'stiffness', folder: 'Mouse', value: 18, min: 1, max: 60, step: 1 },
      { id: 'damp', folder: 'Agent', value: 5, min: 0, max: 14, step: 0.1 },
      { id: 'agentMass', folder: 'Agent', value: 0.2, min: 0.05, max: 2, step: 0.05 },
    ],
    configureAgent: (entry, _scene, values) => {
      entry.agent.mass = values.agentMass as number;
    },
    afterStep: (entry, _scene, values) => {
      entry.agent.mass = values.agentMass as number;
    },
    buildForces: (_entry, scene, values) => [
      modifiers.sum(
        keepDistanceFromMouse(
          () => [scene.mouse.x, scene.mouse.y],
          values.desiredRadius as number,
          values.stiffness as number,
        ),
        forces.damp(values.damp as number),
      ),
    ],
    drawOverlay: (graphics, scene, values) => {
      if (!scene.mouse.active) return;

      drawRadiusRing(
        graphics,
        scene.mouse.x,
        scene.mouse.y,
        values.desiredRadius as number,
        demoColors.force,
      );
      drawMarker(graphics, scene.mouse.x, scene.mouse.y, demoColors.force);
    },
  },
];

export const Custom2DDemo: React.FC = () => {
  return (
    <FeatureDemo2D
      config={{ active: 'custom', title: 'Custom', modes }}
      sidebarConfig={{

        markdown: sidebarMarkdown,
        sources: [{ label: 'site/pages/demos/2d/custom/index.tsx', language: 'tsx', code: sidebarSource }]
      }}
    />
  );
};

function getIdleHome(agent: object): [number, number] {
  const home = idleHomeByAgent.get(agent);
  if (!home) throw new Error('Missing idle home for custom demo agent');
  return home;
}

function getIdleSeeds(agent: object): { x: number; y: number } {
  const seeds = idleSeedByAgent.get(agent);
  if (!seeds) throw new Error('Missing idle seeds for custom demo agent');
  return seeds;
}

function buildOscillateIdleForce(
  strength: number,
  scale: number,
  idleX: boolean,
  idleY: boolean,
): Force {
  const axisForces: Force[] = [];
  if (idleX) axisForces.push(forces.oscillate([1, 0], strength, scale));
  if (idleY) axisForces.push(forces.oscillate([0, 1], strength, scale * 0.65, Math.PI / 2));

  if (axisForces.length === 0) return forces.constant([0, 0]);
  return modifiers.sum(...axisForces);
}

function keepDistanceFromMouse(
  mouseFn: () => number[],
  desiredRadius: number,
  stiffness: number,
): Force {
  return (agent) => {
    const delta = [0, 0];
    Vector2Fn.subtract(delta, mouseFn(), agent.position);
    const currentDistance = Vector2Fn.length(delta);
    if (currentDistance < 0.001) return [0, 0];

    Vector2Fn.normalize(delta, delta);
    const distanceError = currentDistance - desiredRadius;
    return Vector2Fn.scale(delta, delta, distanceError * stiffness);
  };
}
`,S=e(),C=new WeakMap,w=new WeakMap,T=[{value:`idleDisturbance`,label:`idle disturbance`,presentation:`none`,trackPointer:!0,agentCount:1,maxSpeed:700,maxForce:3600,controls:[{type:`options`,id:`idleForce`,folder:`Idle`,value:`oscillate`,options:{drift:`drift`,oscillate:`oscillate`}},{id:`idleStrength`,folder:`Idle`,value:420,min:0,max:420,step:5},{id:`idleScale`,folder:`Idle`,value:.5,min:.05,max:1.5,step:.05},{type:`boolean`,id:`idleX`,label:`idle x`,folder:`Idle`,value:!1},{type:`boolean`,id:`idleY`,label:`idle y`,folder:`Idle`,value:!0},{id:`homeStrength`,folder:`Home`,value:12,min:.2,max:12,step:.1},{id:`damp`,folder:`Home`,value:5.5,min:0,max:14,step:.1},{id:`mouseRadius`,folder:`Mouse`,value:180,min:60,max:360,step:5},{id:`mouseStrength`,folder:`Mouse`,value:1900,min:0,max:5200,step:50},{id:`agentMass`,folder:`Agent`,value:.2,min:.05,max:2,step:.05}],configureAgent:(e,t,n)=>{e.agent.mass=n.agentMass,C.set(e.agent,[e.agent.position[0],e.agent.position[1]]),w.set(e.agent,{x:Math.random()*1e4,y:Math.random()*1e4})},afterStep:(e,t,n)=>{e.agent.mass=n.agentMass},buildForces:(e,t,r)=>{let i=D(e.agent),a=r.mouseRadius,l=()=>[t.mouse.x,t.mouse.y],u=e=>t.mouse.active&&n(e.position,l())<=a,m=d(()=>i,e=>e*r.homeStrength),g=p(u,h(l,f.constant(r.mouseStrength))),_=r.idleX,v=r.idleY,y=O(e.agent);return[s(r.idleForce===`drift`?o({strength:r.idleStrength,scale:r.idleScale,x:_?{seed:y.x}:!1,y:v?{seed:y.y}:!1}):k(r.idleStrength,r.idleScale,_,v),m,g,c(r.damp))]},drawOverlay:(e,t,n)=>{let[r,i]=t.center(),a=n.mouseRadius;g(e,r,i,y.agent),t.mouse.active&&(_(e,t.mouse.x,t.mouse.y,a,y.force),g(e,t.mouse.x,t.mouse.y,y.force))}},{value:`targetCapture`,label:`target capture`,presentation:`none`,trackPointer:!0,agentCount:1,maxSpeed:900,maxForce:3200,controls:[{id:`targetRadius`,folder:`Target`,value:150,min:50,max:320,step:5},{id:`targetStrength`,folder:`Target`,value:3e3,min:500,max:6e3,step:50},{id:`targetSlowR`,label:`target slow r`,folder:`Target`,value:50,min:10,max:180,step:5},{id:`centerRadius`,folder:`Center`,value:150,min:50,max:320,step:5},{id:`centerStrength`,folder:`Center`,value:1800,min:300,max:4200,step:50},{id:`damp`,folder:`Agent`,value:5,min:0,max:14,step:.1},{id:`agentMass`,folder:`Agent`,value:.2,min:.05,max:2,step:.05}],configureAgent:(e,t,n)=>{e.agent.mass=n.agentMass},afterStep:(e,t,n)=>{e.agent.mass=n.agentMass},buildForces:(e,t,r)=>{let i=r.targetRadius,a=r.centerRadius,o=()=>[t.mouse.x,t.mouse.y],l=()=>n(o(),t.center())<=a,u=e=>t.mouse.active&&l()&&n(e.position,o())<=i;return[s(p(e=>!u(e),d(t.center,f.arrive(r.centerStrength,a))),p(u,d(o,f.arrive(r.targetStrength,r.targetSlowR))),c(r.damp))]},drawOverlay:(e,t,n)=>{let[r,i]=t.center(),a=n.targetRadius,o=n.centerRadius;_(e,r,i,o,y.target),g(e,r,i,y.target),t.mouse.active&&(_(e,t.mouse.x,t.mouse.y,a,y.force),g(e,t.mouse.x,t.mouse.y,y.force))}},{value:`keepDistance`,label:`keepDistance`,presentation:`none`,trackPointer:!0,agentCount:1,maxSpeed:900,maxForce:3200,controls:[{id:`desiredRadius`,folder:`Mouse`,value:150,min:40,max:360,step:5},{id:`stiffness`,folder:`Mouse`,value:18,min:1,max:60,step:1},{id:`damp`,folder:`Agent`,value:5,min:0,max:14,step:.1},{id:`agentMass`,folder:`Agent`,value:.2,min:.05,max:2,step:.05}],configureAgent:(e,t,n)=>{e.agent.mass=n.agentMass},afterStep:(e,t,n)=>{e.agent.mass=n.agentMass},buildForces:(e,t,n)=>[s(A(()=>[t.mouse.x,t.mouse.y],n.desiredRadius,n.stiffness),c(n.damp))],drawOverlay:(e,t,n)=>{t.mouse.active&&(_(e,t.mouse.x,t.mouse.y,n.desiredRadius,y.force),g(e,t.mouse.x,t.mouse.y,y.force))}}],E=()=>(0,S.jsx)(v,{config:{active:`custom`,title:`Custom`,modes:T},sidebarConfig:{markdown:b,sources:[{label:`site/pages/demos/2d/custom/index.tsx`,language:`tsx`,code:x}]}});function D(e){let t=C.get(e);if(!t)throw Error(`Missing idle home for custom demo agent`);return t}function O(e){let t=w.get(e);if(!t)throw Error(`Missing idle seeds for custom demo agent`);return t}function k(e,t,n,r){let i=[];return n&&i.push(m([1,0],e,t)),r&&i.push(m([0,1],e,t*.65,Math.PI/2)),i.length===0?l([0,0]):s(...i)}function A(e,t,n){return o=>{let s=[0,0];a(s,e(),o.position);let c=u(s);return c<.001?[0,0]:(r(s,s),i(s,s,(c-t)*n))}}export{E as Custom2DDemo};