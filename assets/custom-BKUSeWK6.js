import"./chunk-CilyBKbf.js";import{o as e,y as t}from"./index-Dgcz3RY4.js";import{D as n,E as r,T as i,_ as a,f as o,g as s,h as c,k as l,m as u,p as d,u as f,v as p,w as m,y as h}from"./waitForStableSize-BDPXfWAO.js";import{t as g}from"./FeatureDemo3D-CioU9VaY.js";t();var _=`# 3D Custom

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
`,y=e(),b=[{value:`idleDisturbance`,label:`idle disturbance`,marker:`source`,presentation:[{point:`center`,intent:`attract`},{point:`source`,intent:`reject`,radiusControl:`sourceRadius`}],controls:[{type:`options`,id:`idleForce`,folder:`Idle`,value:`drift`,options:{drift:`drift`,oscillate:`oscillate`}},{id:`idleStrength`,folder:`Idle`,value:3.6,min:0,max:12,step:.1},{id:`idleScale`,folder:`Idle`,value:.35,min:.05,max:1.5,step:.05},{type:`boolean`,id:`idleX`,label:`idle x`,folder:`Idle`,value:!0},{type:`boolean`,id:`idleY`,label:`idle y`,folder:`Idle`,value:!0},{type:`boolean`,id:`idleZ`,label:`idle z`,folder:`Idle`,value:!0},{id:`homeStrength`,folder:`Home`,value:1.2,min:.1,max:8,step:.1},{id:`damp`,folder:`Home`,value:1.8,min:0,max:8,step:.1},{id:`sourceRadius`,label:`source r`,folder:`Source`,value:4,min:.5,max:10,step:.1},{id:`sourceStrength`,label:`source strength`,folder:`Source`,value:10,min:0,max:36,step:.1}],buildForces:(e,t,n)=>{let r=t.idleX,i=t.idleY,c=t.idleZ;return[o(t.idleForce===`drift`?a({strength:t.idleStrength,scale:t.idleScale,x:r?{seed:e.seeds.x}:!1,y:i?{seed:e.seeds.y}:!1,z:c?{seed:e.seeds.z}:!1}):S(t.idleStrength,t.idleScale,r,i,c),u(n.points.center,e=>e*t.homeStrength),f(e=>m(e.position,n.points.source())<t.sourceRadius,h(n.points.source,d.constant(t.sourceStrength))),s(t.damp))]}},{value:`targetCapture`,label:`target capture`,marker:`target`,presentation:[{point:`center`,intent:`attract`,radiusControl:`centerRadius`},{point:`target`,intent:`reject`,radiusControl:`targetRadius`}],controls:[{id:`targetRadius`,label:`target r`,folder:`Target`,value:4,min:.5,max:10,step:.1},{id:`targetStrength`,label:`target strength`,folder:`Target`,value:12,min:.5,max:36,step:.1},{id:`targetSlowR`,label:`target slow r`,folder:`Target`,value:1.2,min:.2,max:6,step:.1},{id:`centerRadius`,label:`center r`,folder:`Center`,value:4.5,min:.5,max:10,step:.1},{id:`centerStrength`,label:`center strength`,folder:`Center`,value:8,min:.5,max:36,step:.1},{id:`damp`,folder:`Agent`,value:1.6,min:0,max:8,step:.1}],buildForces:(e,t,n)=>{let r=t.targetRadius,i=t.centerRadius,a=n.points.target,c=()=>m(a(),n.points.center())<=i,l=e=>c()&&m(e.position,a())<=r;return[o(f(e=>!l(e),u(n.points.center,d.arrive(t.centerStrength,i))),f(l,u(a,d.arrive(t.targetStrength,t.targetSlowR))),s(t.damp))]}},{value:`keepDistance`,label:`keep distance`,marker:`source`,presentation:{point:`source`,intent:`reject`,radiusControl:`desiredRadius`},controls:[{id:`desiredRadius`,label:`desired r`,value:4,min:.5,max:10,step:.1},{id:`stiffness`,value:4,min:.2,max:18,step:.1},{id:`damp`,value:1.6,min:0,max:8,step:.1}],buildForces:(e,t,n)=>[o(C(n.points.source,t.desiredRadius,t.stiffness),s(t.damp))]}],x=()=>(0,y.jsx)(g,{config:{active:`three-custom`,paneTitle:`3D Custom`,modes:b},sidebarConfig:{markdown:_,sources:[{label:`site/pages/demos/3d/custom/index.tsx`,language:`tsx`,code:v}]}});function S(e,t,n,r,i){let a=[];return n&&a.push(p([1,0,0],e,t)),r&&a.push(p([0,1,0],e,t*.65,Math.PI/2)),i&&a.push(p([0,0,1],e,t*.8,Math.PI)),a.length===0?c([0,0,0]):o(...a)}function C(e,t,a){let o=[0,0,0];return s=>{l(o,e(),s.position);let c=i(o);return c<.001?[0,0,0]:(r(o,o),n([0,0,0],o,(c-t)*a))}}export{x as Custom3DDemo};