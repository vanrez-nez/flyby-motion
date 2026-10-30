import"./chunk-CilyBKbf.js";import{_ as e,o as t}from"./index-CXGvyNYB.js";import{D as n,E as r,O as i,_ as a,b as o,f as s,g as c,h as l,j as u,k as d,m as f,v as p,x as m,y as h}from"./waitForStableSize-CaV2ELVd.js";import{t as g}from"./FeatureDemo3D-CaDYNsed.js";e();var _=`# 3D Custom

Hand-rolled compositions in 3D. Each mode pairs a structural force (return-to-center, capture, keep-distance) with one or more conditional reactions.

## What to try

- **Idle disturbance** — agents idle near the white center origin with drift / oscillate noise; right-click drag the pink source to disturb them inside its radius.
- **Target capture** — agents hold near the center; if you drag the yellow target inside the center radius, they break out to capture it inside the smaller target radius.
- **Keep distance** — drag the source; agents settle on a sphere around it whose stiffness you can tune.

## Key snippet

Composing return-to-home + reactive repel + ambient idle in one \`sum\`:

\`\`\`ts
modifiers.sum(
  idleForce, // drift or oscillate
  forces.attract(context.points.center, (d) => d * homeStrength),
  modifiers.gate(
    (agent) =>
      distance3(agent.position, source) < sourceRadius,
    forces.repel(() => source, falloff.constant(sourceStrength)),
  ),
  forces.damp(damp),
);
\`\`\`
`,v=`import React from 'react';
import {
  falloff,
  forces,
  modifiers,
  Vector3Fn,
  type Force,
} from '../../../../../src/index';
import { type ThreeMode } from '../../shared/FeatureDemo3D';
import { FeatureDemo3D } from '../../shared/FeatureDemo3D';
import sidebarMarkdown from './info.md?raw';
import sidebarSource from './index.tsx?raw';

const modes: ThreeMode[] = [
  {
    value: 'idleDisturbance',
    label: 'idle disturbance',
    marker: 'source',
    presentation: [
      { point: 'center', intent: 'attract' },
      { point: 'source', intent: 'reject', radiusControl: 'sourceRadius' },
    ],
    controls: [
      {
        type: 'options',
        id: 'idleForce',
        folder: 'Idle',
        value: 'drift',
        options: {
          drift: 'drift',
          oscillate: 'oscillate',
        },
      },
      { id: 'idleStrength', folder: 'Idle', value: 3.6, min: 0, max: 12, step: 0.1 },
      { id: 'idleScale', folder: 'Idle', value: 0.35, min: 0.05, max: 1.5, step: 0.05 },
      { type: 'boolean', id: 'idleX', label: 'idle x', folder: 'Idle', value: true },
      { type: 'boolean', id: 'idleY', label: 'idle y', folder: 'Idle', value: true },
      { type: 'boolean', id: 'idleZ', label: 'idle z', folder: 'Idle', value: true },
      { id: 'homeStrength', folder: 'Home', value: 1.2, min: 0.1, max: 8, step: 0.1 },
      { id: 'damp', folder: 'Home', value: 1.8, min: 0, max: 8, step: 0.1 },
      { id: 'sourceRadius', label: 'source r', folder: 'Source', value: 4, min: 0.5, max: 10, step: 0.1 },
      { id: 'sourceStrength', label: 'source strength', folder: 'Source', value: 10, min: 0, max: 36, step: 0.1 },
    ],
    buildForces: (entry, values, context) => {
      const idleX = values.idleX as boolean;
      const idleY = values.idleY as boolean;
      const idleZ = values.idleZ as boolean;
      const idleForce = values.idleForce === 'drift'
        ? forces.drift({
            strength: values.idleStrength as number,
            scale: values.idleScale as number,
            x: idleX ? { seed: entry.seeds.x } : false,
            y: idleY ? { seed: entry.seeds.y } : false,
            z: idleZ ? { seed: entry.seeds.z } : false,
          })
        : buildOscillateIdleForce(
            values.idleStrength as number,
            values.idleScale as number,
            idleX,
            idleY,
            idleZ,
          );

      return [
        modifiers.sum(
          idleForce,
          forces.attract(context.points.center, (d) => d * (values.homeStrength as number)),
          modifiers.gate(
            (agent) => Vector3Fn.distance(agent.position, context.points.source()) < (values.sourceRadius as number),
            forces.repel(context.points.source, falloff.constant(values.sourceStrength as number)),
          ),
          forces.damp(values.damp as number),
        ),
      ];
    },
  },
  {
    value: 'targetCapture',
    label: 'target capture',
    marker: 'target',
    presentation: [
      { point: 'center', intent: 'attract', radiusControl: 'centerRadius' },
      { point: 'target', intent: 'reject', radiusControl: 'targetRadius' },
    ],
    controls: [
      { id: 'targetRadius', label: 'target r', folder: 'Target', value: 4, min: 0.5, max: 10, step: 0.1 },
      { id: 'targetStrength', label: 'target strength', folder: 'Target', value: 12, min: 0.5, max: 36, step: 0.1 },
      { id: 'targetSlowR', label: 'target slow r', folder: 'Target', value: 1.2, min: 0.2, max: 6, step: 0.1 },
      { id: 'centerRadius', label: 'center r', folder: 'Center', value: 4.5, min: 0.5, max: 10, step: 0.1 },
      { id: 'centerStrength', label: 'center strength', folder: 'Center', value: 8, min: 0.5, max: 36, step: 0.1 },
      { id: 'damp', folder: 'Agent', value: 1.6, min: 0, max: 8, step: 0.1 },
    ],
    buildForces: (_entry, values, context) => {
      const targetRadius = values.targetRadius as number;
      const centerRadius = values.centerRadius as number;
      const targetPoint = context.points.target;
      const isTargetInsideCenter = () => Vector3Fn.distance(targetPoint(), context.points.center()) <= centerRadius;
      const isTargetCaptureActive = (agent: { position: number[] }) =>
        isTargetInsideCenter() &&
        Vector3Fn.distance(agent.position, targetPoint()) <= targetRadius;
      const centerForce = modifiers.gate(
        (agent) => !isTargetCaptureActive(agent),
        forces.attract(
          context.points.center,
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
  },
  {
    value: 'keepDistance',
    label: 'keep distance',
    marker: 'source',
    presentation: { point: 'source', intent: 'reject', radiusControl: 'desiredRadius' },
    controls: [
      { id: 'desiredRadius', label: 'desired r', value: 4, min: 0.5, max: 10, step: 0.1 },
      { id: 'stiffness', value: 4, min: 0.2, max: 18, step: 0.1 },
      { id: 'damp', value: 1.6, min: 0, max: 8, step: 0.1 },
    ],
    buildForces: (_entry, values, context) => [
      modifiers.sum(
        keepDistanceFromPoint(
          context.points.source,
          values.desiredRadius as number,
          values.stiffness as number,
        ),
        forces.damp(values.damp as number),
      ),
    ],
  },
];

export const Custom3DDemo: React.FC = () => {
  return (
    <FeatureDemo3D
      config={{ active: 'three-custom', paneTitle: '3D Custom', modes }}
      sidebarConfig={{

        markdown: sidebarMarkdown,
        sources: [{ label: 'site/pages/demos/3d/custom/index.tsx', language: 'tsx', code: sidebarSource }]
      }}
    />
  );
};

function buildOscillateIdleForce(
  strength: number,
  scale: number,
  idleX: boolean,
  idleY: boolean,
  idleZ: boolean,
): Force {
  const axisForces: Force[] = [];
  if (idleX) axisForces.push(forces.oscillate([1, 0, 0], strength, scale));
  if (idleY) axisForces.push(forces.oscillate([0, 1, 0], strength, scale * 0.65, Math.PI / 2));
  if (idleZ) axisForces.push(forces.oscillate([0, 0, 1], strength, scale * 0.8, Math.PI));

  if (axisForces.length === 0) return forces.constant([0, 0, 0]);
  return modifiers.sum(...axisForces);
}

function keepDistanceFromPoint(
  pointFn: () => number[],
  desiredRadius: number,
  stiffness: number,
): Force {
  const delta = [0, 0, 0];
  return (agent) => {
    Vector3Fn.subtract(delta, pointFn(), agent.position);
    const currentDistance = Vector3Fn.length(delta);
    if (currentDistance < 0.001) return [0, 0, 0];

    Vector3Fn.normalize(delta, delta);
    const distanceError = currentDistance - desiredRadius;
    return Vector3Fn.scale([0, 0, 0], delta, distanceError * stiffness);
  };
}
`,y=t(),b=[{value:`idleDisturbance`,label:`idle disturbance`,marker:`source`,presentation:[{point:`center`,intent:`attract`},{point:`source`,intent:`reject`,radiusControl:`sourceRadius`}],controls:[{type:`options`,id:`idleForce`,folder:`Idle`,value:`drift`,options:{drift:`drift`,oscillate:`oscillate`}},{id:`idleStrength`,folder:`Idle`,value:3.6,min:0,max:12,step:.1},{id:`idleScale`,folder:`Idle`,value:.35,min:.05,max:1.5,step:.05},{type:`boolean`,id:`idleX`,label:`idle x`,folder:`Idle`,value:!0},{type:`boolean`,id:`idleY`,label:`idle y`,folder:`Idle`,value:!0},{type:`boolean`,id:`idleZ`,label:`idle z`,folder:`Idle`,value:!0},{id:`homeStrength`,folder:`Home`,value:1.2,min:.1,max:8,step:.1},{id:`damp`,folder:`Home`,value:1.8,min:0,max:8,step:.1},{id:`sourceRadius`,label:`source r`,folder:`Source`,value:4,min:.5,max:10,step:.1},{id:`sourceStrength`,label:`source strength`,folder:`Source`,value:10,min:0,max:36,step:.1}],buildForces:(e,t,n)=>{let i=t.idleX,a=t.idleY,o=t.idleZ;return[f(t.idleForce===`drift`?h({strength:t.idleStrength,scale:t.idleScale,x:i?{seed:e.seeds.x}:!1,y:a?{seed:e.seeds.y}:!1,z:o?{seed:e.seeds.z}:!1}):S(t.idleStrength,t.idleScale,i,a,o),c(n.points.center,e=>e*t.homeStrength),s(e=>r(e.position,n.points.source())<t.sourceRadius,m(n.points.source,l.constant(t.sourceStrength))),p(t.damp))]}},{value:`targetCapture`,label:`target capture`,marker:`target`,presentation:[{point:`center`,intent:`attract`,radiusControl:`centerRadius`},{point:`target`,intent:`reject`,radiusControl:`targetRadius`}],controls:[{id:`targetRadius`,label:`target r`,folder:`Target`,value:4,min:.5,max:10,step:.1},{id:`targetStrength`,label:`target strength`,folder:`Target`,value:12,min:.5,max:36,step:.1},{id:`targetSlowR`,label:`target slow r`,folder:`Target`,value:1.2,min:.2,max:6,step:.1},{id:`centerRadius`,label:`center r`,folder:`Center`,value:4.5,min:.5,max:10,step:.1},{id:`centerStrength`,label:`center strength`,folder:`Center`,value:8,min:.5,max:36,step:.1},{id:`damp`,folder:`Agent`,value:1.6,min:0,max:8,step:.1}],buildForces:(e,t,n)=>{let i=t.targetRadius,a=t.centerRadius,o=n.points.target,u=()=>r(o(),n.points.center())<=a,d=e=>u()&&r(e.position,o())<=i;return[f(s(e=>!d(e),c(n.points.center,l.arrive(t.centerStrength,a))),s(d,c(o,l.arrive(t.targetStrength,t.targetSlowR))),p(t.damp))]}},{value:`keepDistance`,label:`keep distance`,marker:`source`,presentation:{point:`source`,intent:`reject`,radiusControl:`desiredRadius`},controls:[{id:`desiredRadius`,label:`desired r`,value:4,min:.5,max:10,step:.1},{id:`stiffness`,value:4,min:.2,max:18,step:.1},{id:`damp`,value:1.6,min:0,max:8,step:.1}],buildForces:(e,t,n)=>[f(C(n.points.source,t.desiredRadius,t.stiffness),p(t.damp))]}],x=()=>(0,y.jsx)(g,{config:{active:`three-custom`,paneTitle:`3D Custom`,modes:b},sidebarConfig:{markdown:_,sources:[{label:`site/pages/demos/3d/custom/index.tsx`,language:`tsx`,code:v}]}});function S(e,t,n,r,i){let s=[];return n&&s.push(o([1,0,0],e,t)),r&&s.push(o([0,1,0],e,t*.65,Math.PI/2)),i&&s.push(o([0,0,1],e,t*.8,Math.PI)),s.length===0?a([0,0,0]):f(...s)}function C(e,t,r){let a=[0,0,0];return o=>{u(a,e(),o.position);let s=n(a);return s<.001?[0,0,0]:(i(a,a),d([0,0,0],a,(s-t)*r))}}export{x as Custom3DDemo};