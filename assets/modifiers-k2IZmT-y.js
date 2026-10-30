import"./chunk-CilyBKbf.js";import{o as e,y as t}from"./index-Dgcz3RY4.js";import{A as n,M as r,P as i,c as a,d as o,f as s,j as c,l,m as u,p as d,s as f,u as p,v as m,y as h}from"./waitForStableSize-BDPXfWAO.js";import{t as g}from"./FeatureDemo2D-D1TpCwVp.js";t();var _=`# Modifiers

Modifiers wrap forces to change *when* or *how strongly* they apply. They take a force in and return a force out, so they compose trivially.

## What to try

- \`gate\` — only fires the inner force when a predicate is true (e.g. agent is within range).
- \`during\` — turns a force on between two timestamps.
- \`fadeIn\` / \`fadeOut\` — ramp strength over a duration.
- \`sum\` — combine multiple forces into one (useful for keeping a single registration).
- \`custom\` — write any \`(agent, world, t) => vector\` of your own.

## Key snippets

\`\`\`ts
modifiers.gate(
  (agent) => distance(agent.position, source) < range,
  forces.repel(() => source, falloff.constant(900)),
);
\`\`\`

\`\`\`ts
modifiers.sum(
  baseAttract(scene),
  forces.oscillate([0, 1], 40, 0.5),
);
\`\`\`
`,v=`import React from 'react';
import {
  falloff,
  forces,
  modifiers,
  Vector2Fn,
  type Force,
} from '../../../../../src/index';
import { type FeatureMode } from '../../shared/FeatureDemo2D';
import { FeatureDemo2D } from '../../shared/FeatureDemo2D';
import sidebarMarkdown from './info.md?raw';
import sidebarSource from './index.tsx?raw';

const modes: FeatureMode[] = [
  {
    value: 'scale',
    label: 'scale',
    marker: 'target',
    presentation: 'attract',
    controls: [
      { id: 'k', value: 0.5, min: 0, max: 2, step: 0.05 },
    ],
    buildForces: (_entry, scene, v) => [
      modifiers.scale(baseAttract(scene), v.k as number),
    ],
  },
  {
    value: 'gate',
    label: 'gate',
    marker: 'source',
    presentation: 'reject',
    radiusControl: 'range',
    controls: [
      { id: 'range', value: 240, min: 40, max: 520, step: 5 },
    ],
    buildForces: (_entry, scene, v) => [
      modifiers.gate(
        (agent) => Vector2Fn.distance(agent.position, [scene.source.x, scene.source.y]) < (v.range as number),
        forces.repel(() => [scene.source.x, scene.source.y], falloff.constant(900)),
      ),
    ],
  },
  {
    value: 'during',
    label: 'during',
    marker: 'target',
    presentation: 'attract',
    controls: [
      { id: 'start', value: 1, min: 0, max: 8, step: 0.25 },
      { id: 'end', value: 5, min: 0, max: 10, step: 0.25 },
    ],
    buildForces: (_entry, scene, v) => [
      modifiers.during(v.start as number, v.end as number, baseAttract(scene)),
    ],
  },
  {
    value: 'fadeIn',
    label: 'fadeIn',
    marker: 'target',
    presentation: 'attract',
    controls: [
      { id: 'duration', value: 3, min: 0, max: 8, step: 0.25 },
    ],
    buildForces: (_entry, scene, v) => [
      modifiers.fadeIn(v.duration as number, baseAttract(scene)),
    ],
  },
  {
    value: 'fadeOut',
    label: 'fadeOut',
    marker: 'target',
    presentation: 'attract',
    controls: [
      { id: 'duration', value: 5, min: 0, max: 10, step: 0.25 },
    ],
    buildForces: (_entry, scene, v) => [
      modifiers.fadeOut(v.duration as number, baseAttract(scene)),
    ],
  },
  {
    value: 'sum',
    label: 'sum',
    marker: 'target',
    presentation: 'attract',
    controls: [
      { id: 'amplitude', value: 40, min: 0, max: 180, step: 5 },
      { id: 'freq', value: 0.5, min: 0, max: 2, step: 0.05 },
    ],
    buildForces: (_entry, scene, v) => [
      modifiers.sum(
        baseAttract(scene),
        forces.oscillate([0, 1], v.amplitude as number, v.freq as number),
      ),
    ],
  },
  {
    value: 'custom',
    label: 'custom',
    marker: 'target',
    presentation: 'attract',
    controls: [
      { id: 'strength', value: 700, min: 100, max: 2400, step: 25 },
      { id: 'wobble', value: 120, min: 0, max: 420, step: 5 },
    ],
    buildForces: (_entry, scene, v) => [
      customForce(() => [scene.target.x, scene.target.y], v.strength as number, v.wobble as number),
    ],
  },
];

export const Modifiers2DDemo: React.FC = () => {
  return (
    <FeatureDemo2D
      config={{ active: 'modifiers', title: 'Modifiers', modes }}
      sidebarConfig={{

        markdown: sidebarMarkdown,
        sources: [{ label: 'site/pages/demos/2d/modifiers/index.tsx', language: 'tsx', code: sidebarSource }]
      }}
    />
  );
};

function baseAttract(scene: { target: { x: number; y: number } }): Force {
  return forces.attract(
    () => [scene.target.x, scene.target.y],
    falloff.arrive(900, 180),
  );
}

function customForce(targetFn: () => number[], strength: number, wobble: number): Force {
  const delta = [0, 0];
  return (agent, _world, t) => {
    Vector2Fn.subtract(delta, targetFn(), agent.position);
    const dist = Vector2Fn.length(delta);
    if (dist < 0.001) return [0, 0];
    Vector2Fn.normalize(delta, delta);
    const side = Math.sin(t * 3) * wobble;
    return [
      delta[0] * strength - delta[1] * side,
      delta[1] * strength + delta[0] * side,
    ];
  };
}
`,y=e(),b=[{value:`scale`,label:`scale`,marker:`target`,presentation:`attract`,controls:[{id:`k`,value:.5,min:0,max:2,step:.05}],buildForces:(e,t,n)=>[o(S(t),n.k)]},{value:`gate`,label:`gate`,marker:`source`,presentation:`reject`,radiusControl:`range`,controls:[{id:`range`,value:240,min:40,max:520,step:5}],buildForces:(e,t,r)=>[p(e=>n(e.position,[t.source.x,t.source.y])<r.range,h(()=>[t.source.x,t.source.y],d.constant(900)))]},{value:`during`,label:`during`,marker:`target`,presentation:`attract`,controls:[{id:`start`,value:1,min:0,max:8,step:.25},{id:`end`,value:5,min:0,max:10,step:.25}],buildForces:(e,t,n)=>[f(n.start,n.end,S(t))]},{value:`fadeIn`,label:`fadeIn`,marker:`target`,presentation:`attract`,controls:[{id:`duration`,value:3,min:0,max:8,step:.25}],buildForces:(e,t,n)=>[a(n.duration,S(t))]},{value:`fadeOut`,label:`fadeOut`,marker:`target`,presentation:`attract`,controls:[{id:`duration`,value:5,min:0,max:10,step:.25}],buildForces:(e,t,n)=>[l(n.duration,S(t))]},{value:`sum`,label:`sum`,marker:`target`,presentation:`attract`,controls:[{id:`amplitude`,value:40,min:0,max:180,step:5},{id:`freq`,value:.5,min:0,max:2,step:.05}],buildForces:(e,t,n)=>[s(S(t),m([0,1],n.amplitude,n.freq))]},{value:`custom`,label:`custom`,marker:`target`,presentation:`attract`,controls:[{id:`strength`,value:700,min:100,max:2400,step:25},{id:`wobble`,value:120,min:0,max:420,step:5}],buildForces:(e,t,n)=>[C(()=>[t.target.x,t.target.y],n.strength,n.wobble)]}],x=()=>(0,y.jsx)(g,{config:{active:`modifiers`,title:`Modifiers`,modes:b},sidebarConfig:{markdown:_,sources:[{label:`site/pages/demos/2d/modifiers/index.tsx`,language:`tsx`,code:v}]}});function S(e){return u(()=>[e.target.x,e.target.y],d.arrive(900,180))}function C(e,t,n){let a=[0,0];return(o,s,l)=>{if(i(a,e(),o.position),c(a)<.001)return[0,0];r(a,a);let u=Math.sin(l*3)*n;return[a[0]*t-a[1]*u,a[1]*t+a[0]*u]}}export{x as Modifiers2DDemo};