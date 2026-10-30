import"./chunk-CilyBKbf.js";import{o as e,y as t}from"./index-Dgcz3RY4.js";import{C as n,E as r,O as i,T as a,c as o,d as s,f as c,k as l,l as u,m as d,p as f,s as p,u as m,v as h,w as g,y as _}from"./waitForStableSize-BDPXfWAO.js";import{t as v}from"./FeatureDemo3D-CioU9VaY.js";t();var y=`# 3D Modifiers

Modifiers compose the same way in 3D as in 2D — they wrap a force and decide *when* or *how strongly* it fires. The shape of the wrapped force is unchanged.

## What to try

- \`gate\` — flips on inside the source radius; watch the agents only feel the repel near the marker.
- \`during\` / \`fadeIn\` / \`fadeOut\` — note the timeline-based behavior; press <kbd>R</kbd> to replay.
- \`custom\` — a hand-written force showing how to add a perpendicular wobble to a basic attract.

## Key snippet

\`\`\`ts
modifiers.fadeIn(
  3, // seconds
  forces.attract(() => target, falloff.arrive(8, 2.8)),
);
\`\`\`
`,b=`import React from 'react';
import {
  falloff,
  forces,
  modifiers,
  Vector3Fn,
  type Force,
} from '../../../../../src/index';
import { type ThreeDemoContext, type ThreeMode } from '../../shared/FeatureDemo3D';
import { FeatureDemo3D } from '../../shared/FeatureDemo3D';
import sidebarMarkdown from './info.md?raw';
import sidebarSource from './index.tsx?raw';

const modes: ThreeMode[] = [
  {
    value: 'scale',
    label: 'scale',
    marker: 'target',
    presentation: { point: 'target', intent: 'attract', radiusControl: 'slowR' },
    controls: [
      { id: 'k', value: 0.5, min: 0, max: 2, step: 0.05 },
      { id: 'strength', value: 8, min: 0.5, max: 32, step: 0.1 },
      { id: 'slowR', label: 'slow r', value: 2.8, min: 0.3, max: 10, step: 0.1 },
    ],
    buildForces: (_entry, values, context) => [
      modifiers.scale(baseAttract(context, values.strength as number, values.slowR as number), values.k as number),
    ],
  },
  {
    value: 'gate',
    label: 'gate',
    marker: 'source',
    presentation: { point: 'source', intent: 'reject', radiusControl: 'range' },
    controls: [
      { id: 'range', value: 3.8, min: 0.3, max: 10, step: 0.1 },
      { id: 'strength', value: 8, min: 0.5, max: 32, step: 0.1 },
    ],
    buildForces: (_entry, values, context) => [
      modifiers.gate(
        (agent) => Vector3Fn.distance(agent.position, context.points.source()) < (values.range as number),
        forces.repel(context.points.source, falloff.constant(values.strength as number)),
      ),
    ],
  },
  {
    value: 'during',
    label: 'during',
    marker: 'target',
    presentation: { point: 'target', intent: 'attract', radiusControl: 'slowR' },
    controls: [
      { id: 'start', value: 1, min: 0, max: 8, step: 0.25 },
      { id: 'end', value: 5, min: 0, max: 10, step: 0.25 },
      { id: 'strength', value: 8, min: 0.5, max: 32, step: 0.1 },
      { id: 'slowR', label: 'slow r', value: 2.8, min: 0.3, max: 10, step: 0.1 },
    ],
    buildForces: (_entry, values, context) => [
      modifiers.during(
        values.start as number,
        values.end as number,
        baseAttract(context, values.strength as number, values.slowR as number),
      ),
    ],
  },
  {
    value: 'fadeIn',
    label: 'fadeIn',
    marker: 'target',
    presentation: { point: 'target', intent: 'attract', radiusControl: 'slowR' },
    controls: [
      { id: 'duration', value: 3, min: 0, max: 8, step: 0.25 },
      { id: 'strength', value: 8, min: 0.5, max: 32, step: 0.1 },
      { id: 'slowR', label: 'slow r', value: 2.8, min: 0.3, max: 10, step: 0.1 },
    ],
    buildForces: (_entry, values, context) => [
      modifiers.fadeIn(
        values.duration as number,
        baseAttract(context, values.strength as number, values.slowR as number),
      ),
    ],
  },
  {
    value: 'fadeOut',
    label: 'fadeOut',
    marker: 'target',
    presentation: { point: 'target', intent: 'attract', radiusControl: 'slowR' },
    controls: [
      { id: 'duration', value: 5, min: 0, max: 10, step: 0.25 },
      { id: 'strength', value: 8, min: 0.5, max: 32, step: 0.1 },
      { id: 'slowR', label: 'slow r', value: 2.8, min: 0.3, max: 10, step: 0.1 },
    ],
    buildForces: (_entry, values, context) => [
      modifiers.fadeOut(
        values.duration as number,
        baseAttract(context, values.strength as number, values.slowR as number),
      ),
    ],
  },
  {
    value: 'sum',
    label: 'sum',
    marker: 'target',
    presentation: { point: 'target', intent: 'attract', radiusControl: 'slowR' },
    controls: [
      { id: 'strength', value: 8, min: 0.5, max: 32, step: 0.1 },
      { id: 'slowR', label: 'slow r', value: 2.8, min: 0.3, max: 10, step: 0.1 },
      { id: 'amplitude', value: 2.4, min: 0, max: 12, step: 0.1 },
      { id: 'freq', value: 0.5, min: 0, max: 2, step: 0.05 },
    ],
    buildForces: (_entry, values, context) => [
      modifiers.sum(
        baseAttract(context, values.strength as number, values.slowR as number),
        forces.oscillate([0, 1, 0], values.amplitude as number, values.freq as number),
      ),
    ],
  },
  {
    value: 'custom',
    label: 'custom',
    marker: 'target',
    presentation: { point: 'target', intent: 'attract' },
    controls: [
      { id: 'strength', value: 8, min: 0.5, max: 32, step: 0.1 },
      { id: 'wobble', value: 3, min: 0, max: 12, step: 0.1 },
    ],
    buildForces: (_entry, values, context) => [
      wobbleAttract(
        context.points.target,
        values.strength as number,
        values.wobble as number,
      ),
    ],
  },
];

export const Modifiers3DDemo: React.FC = () => {
  return (
    <FeatureDemo3D
      config={{ active: 'three-modifiers', paneTitle: '3D Modifiers', modes }}
      sidebarConfig={{

        markdown: sidebarMarkdown,
        sources: [{ label: 'site/pages/demos/3d/modifiers/index.tsx', language: 'tsx', code: sidebarSource }]
      }}
    />
  );
};

function baseAttract(context: ThreeDemoContext, strength: number, slowR: number): Force {
  return forces.attract(
    context.points.target,
    falloff.arrive(strength, slowR),
  );
}

function wobbleAttract(targetFn: () => number[], strength: number, wobble: number): Force {
  const toward = [0, 0, 0];
  const perp = [0, 0, 0];
  return (agent, _world, t) => {
    Vector3Fn.subtract(toward, targetFn(), agent.position);
    const dist = Vector3Fn.length(toward);
    if (dist < 0.001) return [0, 0, 0];
    Vector3Fn.normalize(toward, toward);
    // Perpendicular axis = normalized(toward × worldUp). Falls back to worldZ when toward is parallel to up.
    Vector3Fn.cross(perp, toward, [0, 1, 0]);
    if (Vector3Fn.length(perp) < 0.001) {
      Vector3Fn.set(perp, 0, 0, 1);
    } else {
      Vector3Fn.normalize(perp, perp);
    }
    const side = Math.sin(t * 3) * wobble;
    return [
      toward[0] * strength + perp[0] * side,
      toward[1] * strength + perp[1] * side,
      toward[2] * strength + perp[2] * side,
    ];
  };
}
`,x=e(),S=[{value:`scale`,label:`scale`,marker:`target`,presentation:{point:`target`,intent:`attract`,radiusControl:`slowR`},controls:[{id:`k`,value:.5,min:0,max:2,step:.05},{id:`strength`,value:8,min:.5,max:32,step:.1},{id:`slowR`,label:`slow r`,value:2.8,min:.3,max:10,step:.1}],buildForces:(e,t,n)=>[s(w(n,t.strength,t.slowR),t.k)]},{value:`gate`,label:`gate`,marker:`source`,presentation:{point:`source`,intent:`reject`,radiusControl:`range`},controls:[{id:`range`,value:3.8,min:.3,max:10,step:.1},{id:`strength`,value:8,min:.5,max:32,step:.1}],buildForces:(e,t,n)=>[m(e=>g(e.position,n.points.source())<t.range,_(n.points.source,f.constant(t.strength)))]},{value:`during`,label:`during`,marker:`target`,presentation:{point:`target`,intent:`attract`,radiusControl:`slowR`},controls:[{id:`start`,value:1,min:0,max:8,step:.25},{id:`end`,value:5,min:0,max:10,step:.25},{id:`strength`,value:8,min:.5,max:32,step:.1},{id:`slowR`,label:`slow r`,value:2.8,min:.3,max:10,step:.1}],buildForces:(e,t,n)=>[p(t.start,t.end,w(n,t.strength,t.slowR))]},{value:`fadeIn`,label:`fadeIn`,marker:`target`,presentation:{point:`target`,intent:`attract`,radiusControl:`slowR`},controls:[{id:`duration`,value:3,min:0,max:8,step:.25},{id:`strength`,value:8,min:.5,max:32,step:.1},{id:`slowR`,label:`slow r`,value:2.8,min:.3,max:10,step:.1}],buildForces:(e,t,n)=>[o(t.duration,w(n,t.strength,t.slowR))]},{value:`fadeOut`,label:`fadeOut`,marker:`target`,presentation:{point:`target`,intent:`attract`,radiusControl:`slowR`},controls:[{id:`duration`,value:5,min:0,max:10,step:.25},{id:`strength`,value:8,min:.5,max:32,step:.1},{id:`slowR`,label:`slow r`,value:2.8,min:.3,max:10,step:.1}],buildForces:(e,t,n)=>[u(t.duration,w(n,t.strength,t.slowR))]},{value:`sum`,label:`sum`,marker:`target`,presentation:{point:`target`,intent:`attract`,radiusControl:`slowR`},controls:[{id:`strength`,value:8,min:.5,max:32,step:.1},{id:`slowR`,label:`slow r`,value:2.8,min:.3,max:10,step:.1},{id:`amplitude`,value:2.4,min:0,max:12,step:.1},{id:`freq`,value:.5,min:0,max:2,step:.05}],buildForces:(e,t,n)=>[c(w(n,t.strength,t.slowR),h([0,1,0],t.amplitude,t.freq))]},{value:`custom`,label:`custom`,marker:`target`,presentation:{point:`target`,intent:`attract`},controls:[{id:`strength`,value:8,min:.5,max:32,step:.1},{id:`wobble`,value:3,min:0,max:12,step:.1}],buildForces:(e,t,n)=>[T(n.points.target,t.strength,t.wobble)]}],C=()=>(0,x.jsx)(v,{config:{active:`three-modifiers`,paneTitle:`3D Modifiers`,modes:S},sidebarConfig:{markdown:y,sources:[{label:`site/pages/demos/3d/modifiers/index.tsx`,language:`tsx`,code:b}]}});function w(e,t,n){return d(e.points.target,f.arrive(t,n))}function T(e,t,o){let s=[0,0,0],c=[0,0,0];return(u,d,f)=>{if(l(s,e(),u.position),a(s)<.001)return[0,0,0];r(s,s),n(c,s,[0,1,0]),a(c)<.001?i(c,0,0,1):r(c,c);let p=Math.sin(f*3)*o;return[s[0]*t+c[0]*p,s[1]*t+c[1]*p,s[2]*t+c[2]*p]}}export{C as Modifiers3DDemo};