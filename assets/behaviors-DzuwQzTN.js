import"./chunk-CilyBKbf.js";import{_ as e,o as t}from"./index-CXwaT2eW.js";import{a as n,c as r,o as i,s as a}from"./waitForStableSize-CaV2ELVd.js";import{t as o}from"./FeatureDemo2D-CoBTidu7.js";e();var s=`# Behaviors

Behaviors are pre-composed forces tuned for a familiar feel: arriving, fleeing, pursuing, orbiting. Each one is just a \`Force\` under the hood, so you can mix them with anything else.

## What to try

- Drag the marker around — note how \`arrive\` slows down inside the slow-radius while \`flee\` only triggers within \`range\`.
- For \`pursue\`, raise **lookahead** to see the agents anticipate the leader's path.
- For \`orbit\`, change **tangentK** vs **attractK** to switch between tight orbit and inward spiral.

## Key snippets

\`\`\`ts
behaviors.arrive(() => [target.x, target.y], {
  strength: 1800,
  slowR: 220,
  damp: 4,
});
\`\`\`

\`\`\`ts
behaviors.pursue(() => leader, {
  strength: 1600,
  lookahead: 0.45,
});
\`\`\`
`,c=`import React from 'react';
import { behaviors } from '../../../../../src/index';
import { type FeatureMode } from '../../shared/FeatureDemo2D';
import { FeatureDemo2D } from '../../shared/FeatureDemo2D';
import sidebarMarkdown from './info.md?raw';
import sidebarSource from './index.tsx?raw';

const modes: FeatureMode[] = [
  {
    value: 'arrive',
    label: 'arrive',
    marker: 'target',
    presentation: 'attract',
    radiusControl: 'slowR',
    agentCount: 1,
    controls: [
      { id: 'strength', value: 1400, min: 100, max: 2400, step: 25 },
      { id: 'slowR', value: 280, min: 40, max: 520, step: 5 },
      { id: 'damp', value: 4, min: 0, max: 12, step: 0.1 },
    ],
    buildForces: (_entry, scene, v) => [
      behaviors.arrive(() => [scene.target.x, scene.target.y], {
        strength: v.strength as number,
        slowR: v.slowR as number,
        damp: v.damp as number,
      }),
    ],
  },
  {
    value: 'flee',
    label: 'flee',
    marker: 'source',
    presentation: 'reject',
    radiusControl: 'range',
    agentCount: 5,
    maxSpeed: 800,
    maxForce: 3000,
    controls: [
      { id: 'strength', value: 900, min: 100, max: 3000, step: 25 },
      { id: 'range', value: 280, min: 60, max: 600, step: 5 },
      { id: 'damp', value: 1.5, min: 0, max: 8, step: 0.1 },
    ],
    buildForces: (_entry, scene, v) => [
      behaviors.flee(() => [scene.source.x, scene.source.y], {
        strength: v.strength as number,
        range: v.range as number,
        damp: v.damp as number,
      }),
    ],
  },
  {
    value: 'orbit',
    label: 'orbit',
    marker: 'source',
    presentation: 'attract',
    agentCount: 3,
    controls: [
      { id: 'attractK', value: 420, min: 100, max: 2200, step: 25 },
      { id: 'tangentK', value: 180, min: 0, max: 1400, step: 25 },
      { id: 'damp', value: 0.2, min: 0, max: 8, step: 0.1 },
    ],
    initialVelocity: (index, count, _scene, v) => {
      const angle = (index / count) * Math.PI * 2;
      const speed = Math.sqrt(((v.attractK as number) + (v.tangentK as number)) * 180);
      return [Math.cos(angle + Math.PI * 0.5) * speed, Math.sin(angle + Math.PI * 0.5) * speed];
    },
    buildForces: (_entry, scene, v) => [
      behaviors.orbit(() => [scene.source.x, scene.source.y], {
        attractK: v.attractK as number,
        tangentK: v.tangentK as number,
        damp: v.damp as number,
      }),
    ],
  },
  {
    value: 'pursue',
    label: 'pursue',
    marker: 'leader',
    presentation: 'attract',
    controls: [
      { id: 'strength', value: 900, min: 100, max: 2400, step: 25 },
      { id: 'slowR', value: 180, min: 40, max: 420, step: 5 },
      { id: 'damp', value: 1.3, min: 0, max: 8, step: 0.1 },
      { id: 'lookahead', value: 0.45, min: 0, max: 1.5, step: 0.05 },
      { id: 'leaderSpeed', value: 220, min: 40, max: 520, step: 10 },
    ],
    buildForces: (_entry, scene, v) => [
      behaviors.pursue(() => ({
        position: scene.leader.position,
        velocity: scene.leader.velocity,
      }), {
        strength: v.strength as number,
        slowR: v.slowR as number,
        damp: v.damp as number,
        lookahead: v.lookahead as number,
      }),
    ],
  },
];

export const Behaviors2DDemo: React.FC = () => {
  return (
    <FeatureDemo2D
      config={{ active: 'behaviors', title: 'Behaviors', modes }}
      sidebarConfig={{

        markdown: sidebarMarkdown,
        sources: [{ label: 'site/pages/demos/2d/behaviors/index.tsx', language: 'tsx', code: sidebarSource }]
      }}
    />
  );
};
`,l=t(),u=[{value:`arrive`,label:`arrive`,marker:`target`,presentation:`attract`,radiusControl:`slowR`,agentCount:1,controls:[{id:`strength`,value:1400,min:100,max:2400,step:25},{id:`slowR`,value:280,min:40,max:520,step:5},{id:`damp`,value:4,min:0,max:12,step:.1}],buildForces:(e,t,r)=>[n(()=>[t.target.x,t.target.y],{strength:r.strength,slowR:r.slowR,damp:r.damp})]},{value:`flee`,label:`flee`,marker:`source`,presentation:`reject`,radiusControl:`range`,agentCount:5,maxSpeed:800,maxForce:3e3,controls:[{id:`strength`,value:900,min:100,max:3e3,step:25},{id:`range`,value:280,min:60,max:600,step:5},{id:`damp`,value:1.5,min:0,max:8,step:.1}],buildForces:(e,t,n)=>[i(()=>[t.source.x,t.source.y],{strength:n.strength,range:n.range,damp:n.damp})]},{value:`orbit`,label:`orbit`,marker:`source`,presentation:`attract`,agentCount:3,controls:[{id:`attractK`,value:420,min:100,max:2200,step:25},{id:`tangentK`,value:180,min:0,max:1400,step:25},{id:`damp`,value:.2,min:0,max:8,step:.1}],initialVelocity:(e,t,n,r)=>{let i=e/t*Math.PI*2,a=Math.sqrt((r.attractK+r.tangentK)*180);return[Math.cos(i+Math.PI*.5)*a,Math.sin(i+Math.PI*.5)*a]},buildForces:(e,t,n)=>[a(()=>[t.source.x,t.source.y],{attractK:n.attractK,tangentK:n.tangentK,damp:n.damp})]},{value:`pursue`,label:`pursue`,marker:`leader`,presentation:`attract`,controls:[{id:`strength`,value:900,min:100,max:2400,step:25},{id:`slowR`,value:180,min:40,max:420,step:5},{id:`damp`,value:1.3,min:0,max:8,step:.1},{id:`lookahead`,value:.45,min:0,max:1.5,step:.05},{id:`leaderSpeed`,value:220,min:40,max:520,step:10}],buildForces:(e,t,n)=>[r(()=>({position:t.leader.position,velocity:t.leader.velocity}),{strength:n.strength,slowR:n.slowR,damp:n.damp,lookahead:n.lookahead})]}],d=()=>(0,l.jsx)(o,{config:{active:`behaviors`,title:`Behaviors`,modes:u},sidebarConfig:{markdown:s,sources:[{label:`site/pages/demos/2d/behaviors/index.tsx`,language:`tsx`,code:c}]}});export{d as Behaviors2DDemo};