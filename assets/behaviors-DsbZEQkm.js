import"./chunk-CilyBKbf.js";import{_ as e,o as t}from"./index-FSF-g8v5.js";import{C as n,a as r,c as i,g as a,m as o,o as s,v as c}from"./waitForStableSize-CaV2ELVd.js";import{t as l}from"./FeatureDemo3D-BZ6upnis.js";e();var u=`# 3D Behaviors

Pre-composed behaviors (\`arrive\`, \`flee\`, \`pursue\`, \`orbit\`) running in 3D. The 2D and 3D builds share the same code path — pass 3-vectors and you get 3D motion.

## What to try

- Right-click drag the yellow target or pink source.
- For \`pursue\`, raise **lookahead** to see anticipation; the leader follows a parametric curve.
- For \`orbit\`, change the \`axisX/Y/Z\` sliders to tilt the orbit plane.

## Key snippets

\`\`\`ts
behaviors.arrive(() => [target.x, target.y, target.z], {
  strength: 9,
  slowR: 3.2,
  damp: 1.6,
});
\`\`\`

Orbit = attract + tangential around an axis:

\`\`\`ts
modifiers.sum(
  forces.attract(() => source, () => attractK),
  forces.tangentialAround([0, 1, 0], tangentK),
  forces.damp(0.25),
);
\`\`\`
`,d=`import React from 'react';
import {
  behaviors,
  forces,
  modifiers,
} from '../../../../../src/index';
import { type ThreeMode } from '../../shared/FeatureDemo3D';
import { FeatureDemo3D } from '../../shared/FeatureDemo3D';
import sidebarMarkdown from './info.md?raw';
import sidebarSource from './index.tsx?raw';

const modes: ThreeMode[] = [
  {
    value: 'arrive',
    label: 'arrive',
    marker: 'target',
    presentation: { point: 'target', intent: 'attract', radiusControl: 'slowR' },
    controls: [
      { id: 'strength', value: 9, min: 0.5, max: 32, step: 0.1 },
      { id: 'slowR', label: 'slow r', value: 3.2, min: 0.3, max: 10, step: 0.1 },
      { id: 'damp', value: 1.6, min: 0, max: 8, step: 0.1 },
    ],
    buildForces: (_entry, values, context) => [
      behaviors.arrive(context.points.target, {
        strength: values.strength as number,
        slowR: values.slowR as number,
        damp: values.damp as number,
      }),
    ],
  },
  {
    value: 'flee',
    label: 'flee',
    marker: 'source',
    presentation: { point: 'source', intent: 'reject', radiusControl: 'range' },
    controls: [
      { id: 'strength', value: 7, min: 0.5, max: 32, step: 0.1 },
      { id: 'range', value: 3.8, min: 0.3, max: 10, step: 0.1 },
      { id: 'damp', value: 1.4, min: 0, max: 8, step: 0.1 },
    ],
    buildForces: (_entry, values, context) => [
      behaviors.flee(context.points.source, {
        strength: values.strength as number,
        range: values.range as number,
        damp: values.damp as number,
      }),
    ],
  },
  {
    value: 'pursue',
    label: 'pursue',
    presentation: { point: 'leader', intent: 'attract', radiusControl: 'slowR' },
    controls: [
      { id: 'strength', value: 8, min: 0.5, max: 32, step: 0.1 },
      { id: 'slowR', label: 'slow r', value: 2.8, min: 0.3, max: 10, step: 0.1 },
      { id: 'damp', value: 1.2, min: 0, max: 8, step: 0.1 },
      { id: 'lookahead', value: 0.45, min: 0, max: 1.5, step: 0.05 },
      { id: 'leaderSpeed', label: 'leader speed', value: 1.2, min: 0.1, max: 4, step: 0.1 },
    ],
    buildForces: (_entry, values, context) => [
      behaviors.pursue(() => ({
        position: context.leader.position,
        velocity: context.leader.velocity,
      }), {
        strength: values.strength as number,
        slowR: values.slowR as number,
        damp: values.damp as number,
        lookahead: values.lookahead as number,
      }),
    ],
  },
  {
    value: 'orbit',
    label: 'orbit',
    marker: 'source',
    presentation: { point: 'source', intent: 'attract' },
    controls: [
      { id: 'attractK', label: 'attract k', value: 4.5, min: 0.2, max: 18, step: 0.1 },
      { id: 'tangentK', label: 'tangent k', value: 3.2, min: 0, max: 18, step: 0.1 },
      { id: 'damp', value: 0.25, min: 0, max: 6, step: 0.05 },
      { id: 'axisX', label: 'axis x', value: 0, min: -1, max: 1, step: 0.1 },
      { id: 'axisY', label: 'axis y', value: 1, min: -1, max: 1, step: 0.1 },
      { id: 'axisZ', label: 'axis z', value: 0, min: -1, max: 1, step: 0.1 },
    ],
    initialVelocity: (index, count) => {
      const angle = (index / count) * Math.PI * 2;
      return [Math.cos(angle + Math.PI * 0.5) * 3.2, 0, Math.sin(angle + Math.PI * 0.5) * 3.2];
    },
    buildForces: (_entry, values, context) => [
      modifiers.sum(
        forces.attract(context.points.source, () => values.attractK as number),
        forces.tangentialAround(
          [values.axisX as number, values.axisY as number, values.axisZ as number],
          values.tangentK as number,
        ),
        forces.damp(values.damp as number),
      ),
    ],
  },
];

export const Behaviors3DDemo: React.FC = () => {
  return (
    <FeatureDemo3D
      config={{ active: 'three-behaviors', paneTitle: '3D Behaviors', modes }}
      sidebarConfig={{

        markdown: sidebarMarkdown,
        sources: [{ label: 'site/pages/demos/3d/behaviors/index.tsx', language: 'tsx', code: sidebarSource }]
      }}
    />
  );
};
`,f=t(),p=[{value:`arrive`,label:`arrive`,marker:`target`,presentation:{point:`target`,intent:`attract`,radiusControl:`slowR`},controls:[{id:`strength`,value:9,min:.5,max:32,step:.1},{id:`slowR`,label:`slow r`,value:3.2,min:.3,max:10,step:.1},{id:`damp`,value:1.6,min:0,max:8,step:.1}],buildForces:(e,t,n)=>[r(n.points.target,{strength:t.strength,slowR:t.slowR,damp:t.damp})]},{value:`flee`,label:`flee`,marker:`source`,presentation:{point:`source`,intent:`reject`,radiusControl:`range`},controls:[{id:`strength`,value:7,min:.5,max:32,step:.1},{id:`range`,value:3.8,min:.3,max:10,step:.1},{id:`damp`,value:1.4,min:0,max:8,step:.1}],buildForces:(e,t,n)=>[s(n.points.source,{strength:t.strength,range:t.range,damp:t.damp})]},{value:`pursue`,label:`pursue`,presentation:{point:`leader`,intent:`attract`,radiusControl:`slowR`},controls:[{id:`strength`,value:8,min:.5,max:32,step:.1},{id:`slowR`,label:`slow r`,value:2.8,min:.3,max:10,step:.1},{id:`damp`,value:1.2,min:0,max:8,step:.1},{id:`lookahead`,value:.45,min:0,max:1.5,step:.05},{id:`leaderSpeed`,label:`leader speed`,value:1.2,min:.1,max:4,step:.1}],buildForces:(e,t,n)=>[i(()=>({position:n.leader.position,velocity:n.leader.velocity}),{strength:t.strength,slowR:t.slowR,damp:t.damp,lookahead:t.lookahead})]},{value:`orbit`,label:`orbit`,marker:`source`,presentation:{point:`source`,intent:`attract`},controls:[{id:`attractK`,label:`attract k`,value:4.5,min:.2,max:18,step:.1},{id:`tangentK`,label:`tangent k`,value:3.2,min:0,max:18,step:.1},{id:`damp`,value:.25,min:0,max:6,step:.05},{id:`axisX`,label:`axis x`,value:0,min:-1,max:1,step:.1},{id:`axisY`,label:`axis y`,value:1,min:-1,max:1,step:.1},{id:`axisZ`,label:`axis z`,value:0,min:-1,max:1,step:.1}],initialVelocity:(e,t)=>{let n=e/t*Math.PI*2;return[Math.cos(n+Math.PI*.5)*3.2,0,Math.sin(n+Math.PI*.5)*3.2]},buildForces:(e,t,r)=>[o(a(r.points.source,()=>t.attractK),n([t.axisX,t.axisY,t.axisZ],t.tangentK),c(t.damp))]}],m=()=>(0,f.jsx)(l,{config:{active:`three-behaviors`,paneTitle:`3D Behaviors`,modes:p},sidebarConfig:{markdown:u,sources:[{label:`site/pages/demos/3d/behaviors/index.tsx`,language:`tsx`,code:d}]}});export{m as Behaviors3DDemo};