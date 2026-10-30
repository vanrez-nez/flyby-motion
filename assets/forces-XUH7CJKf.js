import"./chunk-CilyBKbf.js";import{_ as e,o as t}from"./index-CXwaT2eW.js";import{S as n,_ as r,b as i,g as a,h as o,v as s,x as c,y as l}from"./waitForStableSize-CaV2ELVd.js";import{t as u}from"./FeatureDemo2D-CoBTidu7.js";e();var d=`# Forces

A force is a function \`(agent, world, t) => vector\`. The library composes them per agent and the integrator does the rest. Each mode in this demo isolates a single primitive so you can feel it on its own.

## What to try

- Switch modes from the **mode** dropdown.
- Drag the yellow target (attract) or pink source (repel) marker on the canvas.
- For \`drift\` and \`oscillate\`, toggle the per-axis booleans to see what each axis contributes.
- Press <kbd>R</kbd> to reset positions.

## Key snippets

A point attractor with a falloff curve:

\`\`\`ts
forces.attract(
  () => [scene.target.x, scene.target.y],
  falloff.arrive(900, 220),
);
\`\`\`

\`damp\` is just velocity-proportional drag, useful as a stabilizer:

\`\`\`ts
forces.damp(2);
\`\`\`

Stack idle motion onto a structured force:

\`\`\`ts
forces.drift({
  strength: 220,
  scale: 0.45,
  x: { seed: seedX },
  y: { seed: seedY },
});
\`\`\`
`,f=`import React from 'react';
import { falloff, forces, type FalloffFn } from '../../../../../src/index';
import { type FeatureMode, type DemoControlValues } from '../../shared/FeatureDemo2D';
import { FeatureDemo2D } from '../../shared/FeatureDemo2D';
import sidebarMarkdown from './info.md?raw';
import sidebarSource from './index.tsx?raw';

const directionMap: Record<string, number[]> = {
  right: [1, 0],
  left: [-1, 0],
  down: [0, 1],
  up: [0, -1],
};

const driftSeedsByAgent = new WeakMap<object, { x: number; y: number }>();

const falloffControls = [
  { type: 'options' as const, id: 'falloff', value: 'constant', options: { constant: 'constant', linear: 'linear', invSquare: 'invSquare', arrive: 'arrive', exponential: 'exponential' } },
  { id: 'k', value: 900, min: 10, max: 3000, step: 10 },
  { id: 'eps', value: 0.001, min: 0.001, max: 1, step: 0.001 },
  { id: 'slowR', value: 220, min: 20, max: 520, step: 5 },
  { id: 'rate', value: 0.01, min: 0, max: 0.08, step: 0.001 },
  { id: 'maxR', value: 0, min: 0, max: 640, step: 5 },
  { id: 'minR', value: 0, min: 0, max: 320, step: 5 },
];

const modes: FeatureMode[] = [
  {
    value: 'attract',
    label: 'attract',
    marker: 'target',
    presentation: 'attract',
    radiusControl: 'maxR',
    controls: falloffControls,
    buildForces: (_entry, scene, v) => [
      forces.attract(() => [scene.target.x, scene.target.y], makeFalloff(v)),
    ],
  },
  {
    value: 'repel',
    label: 'repel',
    marker: 'source',
    presentation: 'reject',
    radiusControl: 'maxR',
    controls: falloffControls.map((control) => ({ ...control })),
    buildForces: (_entry, scene, v) => [
      forces.repel(() => [scene.source.x, scene.source.y], makeFalloff(v)),
    ],
  },
  {
    value: 'damp',
    label: 'damp',
    presentation: 'none',
    controls: [
      { id: 'coefficient', value: 2, min: 0, max: 10, step: 0.1 },
    ],
    initialVelocity: (index) => [[220, -120], [-180, 80], [120, 160]][index] as [number, number],
    buildForces: (_entry, _scene, v) => [
      forces.damp(v.coefficient as number),
    ],
  },
  {
    value: 'drift',
    label: 'drift',
    presentation: 'none',
    controls: [
      { id: 'strength', value: 220, min: 0, max: 600, step: 5 },
      { id: 'scale', value: 0.45, min: 0.05, max: 2, step: 0.05 },
      { type: 'boolean', id: 'x', label: 'x axis', value: true },
      { type: 'boolean', id: 'y', label: 'y axis', value: true },
      { id: 'damp', value: 4, min: 0, max: 14, step: 0.1 },
    ],
    configureAgent: (entry) => {
      driftSeedsByAgent.set(entry.agent, {
        x: Math.random() * 10000,
        y: Math.random() * 10000,
      });
    },
    buildForces: (entry, _scene, v) => {
      const seeds = driftSeedsByAgent.get(entry.agent);
      if (!seeds) throw new Error('Missing drift seeds for forces demo agent');
      return [
        forces.drift({
          strength: v.strength as number,
          scale: v.scale as number,
          x: v.x ? { seed: seeds.x } : false,
          y: v.y ? { seed: seeds.y } : false,
        }),
        forces.damp(v.damp as number),
      ];
    },
  },
  {
    value: 'oscillate',
    label: 'oscillate',
    presentation: 'none',
    controls: [
      { type: 'options', id: 'direction', value: 'up', options: { right: 'right', left: 'left', down: 'down', up: 'up' } },
      { id: 'amplitude', value: 60, min: 0, max: 240, step: 5 },
      { id: 'freq', value: 0.5, min: 0, max: 2, step: 0.05 },
      { id: 'phase', value: 0, min: 0, max: Math.PI * 2, step: 0.1 },
    ],
    buildForces: (_entry, _scene, v) => [
      forces.oscillate(
        directionMap[v.direction as string],
        v.amplitude as number,
        v.freq as number,
        v.phase as number,
      ),
    ],
  },
  {
    value: 'constant',
    label: 'constant',
    presentation: 'none',
    controls: [
      { id: 'vecX', label: 'vec x', value: 120, min: -400, max: 400, step: 10 },
      { id: 'vecY', label: 'vec y', value: 0, min: -400, max: 400, step: 10 },
    ],
    buildForces: (_entry, _scene, v) => [
      forces.constant([v.vecX as number, v.vecY as number]),
    ],
  },
  {
    value: 'tangential',
    label: 'tangential',
    presentation: 'none',
    controls: [
      { id: 'k', value: 180, min: 0, max: 1400, step: 25 },
    ],
    initialVelocity: (index) => [[220, 0], [0, 220], [-160, 160]][index] as [number, number],
    buildForces: (_entry, _scene, v) => [
      forces.tangential(v.k as number),
    ],
  },
];

export const Forces2DDemo: React.FC = () => {
  return (
    <FeatureDemo2D
      config={{ active: 'forces', title: 'Forces', modes }}
      sidebarConfig={{

        markdown: sidebarMarkdown,
        sources: [{ label: 'site/pages/demos/2d/forces/index.tsx', language: 'tsx', code: sidebarSource }]
      }}
    />
  );
};

function makeFalloff(values: DemoControlValues): FalloffFn {
  const kind = values.falloff as string;
  const k = values.k as number;
  let fn: FalloffFn;

  if (kind === 'linear') {
    fn = falloff.linear(k);
  } else if (kind === 'invSquare') {
    fn = falloff.invSquare(k, values.eps as number);
  } else if (kind === 'arrive') {
    fn = falloff.arrive(k, values.slowR as number);
  } else if (kind === 'exponential') {
    fn = falloff.exponential(k, values.rate as number);
  } else {
    fn = falloff.constant(k);
  }

  const maxR = values.maxR as number;
  const minR = values.minR as number;
  if (minR > 0) fn = falloff.beyond(fn, minR);
  if (maxR > 0) fn = falloff.within(fn, maxR);
  return fn;
}
`,p=t(),m={right:[1,0],left:[-1,0],down:[0,1],up:[0,-1]},h=new WeakMap,g=[{type:`options`,id:`falloff`,value:`constant`,options:{constant:`constant`,linear:`linear`,invSquare:`invSquare`,arrive:`arrive`,exponential:`exponential`}},{id:`k`,value:900,min:10,max:3e3,step:10},{id:`eps`,value:.001,min:.001,max:1,step:.001},{id:`slowR`,value:220,min:20,max:520,step:5},{id:`rate`,value:.01,min:0,max:.08,step:.001},{id:`maxR`,value:0,min:0,max:640,step:5},{id:`minR`,value:0,min:0,max:320,step:5}],_=[{value:`attract`,label:`attract`,marker:`target`,presentation:`attract`,radiusControl:`maxR`,controls:g,buildForces:(e,t,n)=>[a(()=>[t.target.x,t.target.y],y(n))]},{value:`repel`,label:`repel`,marker:`source`,presentation:`reject`,radiusControl:`maxR`,controls:g.map(e=>({...e})),buildForces:(e,t,n)=>[c(()=>[t.source.x,t.source.y],y(n))]},{value:`damp`,label:`damp`,presentation:`none`,controls:[{id:`coefficient`,value:2,min:0,max:10,step:.1}],initialVelocity:e=>[[220,-120],[-180,80],[120,160]][e],buildForces:(e,t,n)=>[s(n.coefficient)]},{value:`drift`,label:`drift`,presentation:`none`,controls:[{id:`strength`,value:220,min:0,max:600,step:5},{id:`scale`,value:.45,min:.05,max:2,step:.05},{type:`boolean`,id:`x`,label:`x axis`,value:!0},{type:`boolean`,id:`y`,label:`y axis`,value:!0},{id:`damp`,value:4,min:0,max:14,step:.1}],configureAgent:e=>{h.set(e.agent,{x:Math.random()*1e4,y:Math.random()*1e4})},buildForces:(e,t,n)=>{let r=h.get(e.agent);if(!r)throw Error(`Missing drift seeds for forces demo agent`);return[l({strength:n.strength,scale:n.scale,x:n.x?{seed:r.x}:!1,y:n.y?{seed:r.y}:!1}),s(n.damp)]}},{value:`oscillate`,label:`oscillate`,presentation:`none`,controls:[{type:`options`,id:`direction`,value:`up`,options:{right:`right`,left:`left`,down:`down`,up:`up`}},{id:`amplitude`,value:60,min:0,max:240,step:5},{id:`freq`,value:.5,min:0,max:2,step:.05},{id:`phase`,value:0,min:0,max:Math.PI*2,step:.1}],buildForces:(e,t,n)=>[i(m[n.direction],n.amplitude,n.freq,n.phase)]},{value:`constant`,label:`constant`,presentation:`none`,controls:[{id:`vecX`,label:`vec x`,value:120,min:-400,max:400,step:10},{id:`vecY`,label:`vec y`,value:0,min:-400,max:400,step:10}],buildForces:(e,t,n)=>[r([n.vecX,n.vecY])]},{value:`tangential`,label:`tangential`,presentation:`none`,controls:[{id:`k`,value:180,min:0,max:1400,step:25}],initialVelocity:e=>[[220,0],[0,220],[-160,160]][e],buildForces:(e,t,r)=>[n(r.k)]}],v=()=>(0,p.jsx)(u,{config:{active:`forces`,title:`Forces`,modes:_},sidebarConfig:{markdown:d,sources:[{label:`site/pages/demos/2d/forces/index.tsx`,language:`tsx`,code:f}]}});function y(e){let t=e.falloff,n=e.k,r;r=t===`linear`?o.linear(n):t===`invSquare`?o.invSquare(n,e.eps):t===`arrive`?o.arrive(n,e.slowR):t===`exponential`?o.exponential(n,e.rate):o.constant(n);let i=e.maxR,a=e.minR;return a>0&&(r=o.beyond(r,a)),i>0&&(r=o.within(r,i)),r}export{v as Forces2DDemo};