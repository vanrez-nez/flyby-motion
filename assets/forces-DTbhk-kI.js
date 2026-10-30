import"./chunk-CilyBKbf.js";import{_ as e,o as t}from"./index-CXwaT2eW.js";import{C as n,_ as r,b as i,g as a,v as o,x as s,y as c}from"./waitForStableSize-CaV2ELVd.js";import{a as l,i as u,n as d,r as f,t as p}from"./FeatureDemo3D-DkWmwx7z.js";e();var m=`# 3D Forces

The same force primitives as the 2D demo, applied to agents living in 3D. Vectors automatically dispatch on \`agent.position.length\`, so a force you write once works in either dimensionality.

## What to try

- Switch modes from the **mode** dropdown.
- **Right-click and drag** the yellow target or pink source marker to move it through the scene (it stays on the camera-facing plane).
- For \`drift\` and \`tangentialAround\`, toggle the per-axis options to see how the noise / rotation maps onto each axis.
- Press <kbd>R</kbd> to reset; orbit the scene with the left mouse button.

## Key snippets

3D attract uses the same call shape as 2D — only the vectors are 3D:

\`\`\`ts
forces.attract(
  () => [target.x, target.y, target.z],
  falloff.arrive(8, 2.4),
);
\`\`\`

\`tangentialAround\` is the 3D analog of 2D \`tangential\`: rotate around an axis instead of a point.

\`\`\`ts
forces.tangentialAround([0, 1, 0], 4); // spin around world Y
\`\`\`
`,h=`import React from 'react';
import { forces } from '../../../../../src/index';
import {
  cloneControls,
  directionMap,
  falloffControls,
  makeFalloff,
} from '../../shared/modeUtils';
import { type ThreeMode } from '../../shared/FeatureDemo3D';
import { FeatureDemo3D } from '../../shared/FeatureDemo3D';
import sidebarMarkdown from './info.md?raw';
import sidebarSource from './index.tsx?raw';

const modes: ThreeMode[] = [
  {
    value: 'attract',
    label: 'attract',
    marker: 'target',
    presentation: { point: 'target', intent: 'attract', radiusControl: 'maxR' },
    controls: cloneControls(falloffControls),
    buildForces: (_entry, values, context) => [
      forces.attract(context.points.target, makeFalloff(values)),
    ],
  },
  {
    value: 'repel',
    label: 'repel',
    marker: 'source',
    presentation: { point: 'source', intent: 'reject', radiusControl: 'maxR' },
    controls: cloneControls(falloffControls, { maxR: 3.8 }),
    buildForces: (_entry, values, context) => [
      forces.repel(context.points.source, makeFalloff(values)),
    ],
  },
  {
    value: 'damp',
    label: 'damp',
    controls: [
      { id: 'coefficient', value: 1.2, min: 0, max: 8, step: 0.1 },
    ],
    initialVelocity: (index) => [
      [3, 1.2, -1.5],
      [-2.5, 0.5, 1.2],
      [1.4, -0.8, 2.6],
    ][index] as [number, number, number],
    buildForces: (_entry, values) => [
      forces.damp(values.coefficient as number),
    ],
  },
  {
    value: 'drift',
    label: 'drift',
    controls: [
      { id: 'strength', value: 3.5, min: 0, max: 16, step: 0.1 },
      { id: 'scale', value: 0.45, min: 0.05, max: 2, step: 0.05 },
      { type: 'boolean', id: 'x', label: 'x axis', value: true },
      { type: 'boolean', id: 'y', label: 'y axis', value: true },
      { type: 'boolean', id: 'z', label: 'z axis', value: true },
      { id: 'damp', value: 1.8, min: 0, max: 8, step: 0.1 },
    ],
    buildForces: (entry, values) => [
      forces.drift({
        strength: values.strength as number,
        scale: values.scale as number,
        x: values.x ? { seed: entry.seeds.x } : false,
        y: values.y ? { seed: entry.seeds.y } : false,
        z: values.z ? { seed: entry.seeds.z } : false,
      }),
      forces.damp(values.damp as number),
    ],
  },
  {
    value: 'oscillate',
    label: 'oscillate',
    controls: [
      { type: 'options', id: 'direction', value: 'y', options: { x: 'x', '-x': '-x', y: 'y', '-y': '-y', z: 'z', '-z': '-z' } },
      { id: 'amplitude', value: 3.2, min: 0, max: 16, step: 0.1 },
      { id: 'freq', value: 0.5, min: 0, max: 2, step: 0.05 },
      { id: 'phase', value: 0, min: 0, max: Math.PI * 2, step: 0.1 },
    ],
    buildForces: (_entry, values) => [
      forces.oscillate(
        directionMap[values.direction as string],
        values.amplitude as number,
        values.freq as number,
        values.phase as number,
      ),
    ],
  },
  {
    value: 'constant',
    label: 'constant',
    controls: [
      { id: 'vecX', label: 'vec x', value: 2, min: -10, max: 10, step: 0.1 },
      { id: 'vecY', label: 'vec y', value: 0, min: -10, max: 10, step: 0.1 },
      { id: 'vecZ', label: 'vec z', value: 0, min: -10, max: 10, step: 0.1 },
    ],
    buildForces: (_entry, values) => [
      forces.constant([values.vecX as number, values.vecY as number, values.vecZ as number]),
    ],
  },
  {
    value: 'tangentialAround',
    label: 'tangentialAround',
    controls: [
      { id: 'k', value: 4, min: 0, max: 24, step: 0.2 },
      { id: 'axisX', label: 'axis x', value: 0, min: -1, max: 1, step: 0.1 },
      { id: 'axisY', label: 'axis y', value: 1, min: -1, max: 1, step: 0.1 },
      { id: 'axisZ', label: 'axis z', value: 0, min: -1, max: 1, step: 0.1 },
    ],
    initialVelocity: (index) => [
      [3, 0, 0],
      [0, 0, 3],
      [-2.2, 0, 2.2],
    ][index] as [number, number, number],
    buildForces: (_entry, values) => [
      forces.tangentialAround(
        [values.axisX as number, values.axisY as number, values.axisZ as number],
        values.k as number,
      ),
    ],
  },
];

export const Forces3DDemo: React.FC = () => {
  return (
    <FeatureDemo3D
      config={{ active: 'three-forces', paneTitle: '3D Forces', modes }}
      sidebarConfig={{

        markdown: sidebarMarkdown,
        sources: [{ label: 'site/pages/demos/3d/forces/index.tsx', language: 'tsx', code: sidebarSource }]
      }}
    />
  );
};
`,g=t(),_=[{value:`attract`,label:`attract`,marker:`target`,presentation:{point:`target`,intent:`attract`,radiusControl:`maxR`},controls:d(u),buildForces:(e,t,n)=>[a(n.points.target,l(t))]},{value:`repel`,label:`repel`,marker:`source`,presentation:{point:`source`,intent:`reject`,radiusControl:`maxR`},controls:d(u,{maxR:3.8}),buildForces:(e,t,n)=>[s(n.points.source,l(t))]},{value:`damp`,label:`damp`,controls:[{id:`coefficient`,value:1.2,min:0,max:8,step:.1}],initialVelocity:e=>[[3,1.2,-1.5],[-2.5,.5,1.2],[1.4,-.8,2.6]][e],buildForces:(e,t)=>[o(t.coefficient)]},{value:`drift`,label:`drift`,controls:[{id:`strength`,value:3.5,min:0,max:16,step:.1},{id:`scale`,value:.45,min:.05,max:2,step:.05},{type:`boolean`,id:`x`,label:`x axis`,value:!0},{type:`boolean`,id:`y`,label:`y axis`,value:!0},{type:`boolean`,id:`z`,label:`z axis`,value:!0},{id:`damp`,value:1.8,min:0,max:8,step:.1}],buildForces:(e,t)=>[c({strength:t.strength,scale:t.scale,x:t.x?{seed:e.seeds.x}:!1,y:t.y?{seed:e.seeds.y}:!1,z:t.z?{seed:e.seeds.z}:!1}),o(t.damp)]},{value:`oscillate`,label:`oscillate`,controls:[{type:`options`,id:`direction`,value:`y`,options:{x:`x`,"-x":`-x`,y:`y`,"-y":`-y`,z:`z`,"-z":`-z`}},{id:`amplitude`,value:3.2,min:0,max:16,step:.1},{id:`freq`,value:.5,min:0,max:2,step:.05},{id:`phase`,value:0,min:0,max:Math.PI*2,step:.1}],buildForces:(e,t)=>[i(f[t.direction],t.amplitude,t.freq,t.phase)]},{value:`constant`,label:`constant`,controls:[{id:`vecX`,label:`vec x`,value:2,min:-10,max:10,step:.1},{id:`vecY`,label:`vec y`,value:0,min:-10,max:10,step:.1},{id:`vecZ`,label:`vec z`,value:0,min:-10,max:10,step:.1}],buildForces:(e,t)=>[r([t.vecX,t.vecY,t.vecZ])]},{value:`tangentialAround`,label:`tangentialAround`,controls:[{id:`k`,value:4,min:0,max:24,step:.2},{id:`axisX`,label:`axis x`,value:0,min:-1,max:1,step:.1},{id:`axisY`,label:`axis y`,value:1,min:-1,max:1,step:.1},{id:`axisZ`,label:`axis z`,value:0,min:-1,max:1,step:.1}],initialVelocity:e=>[[3,0,0],[0,0,3],[-2.2,0,2.2]][e],buildForces:(e,t)=>[n([t.axisX,t.axisY,t.axisZ],t.k)]}],v=()=>(0,g.jsx)(p,{config:{active:`three-forces`,paneTitle:`3D Forces`,modes:_},sidebarConfig:{markdown:m,sources:[{label:`site/pages/demos/3d/forces/index.tsx`,language:`tsx`,code:h}]}});export{v as Forces3DDemo};