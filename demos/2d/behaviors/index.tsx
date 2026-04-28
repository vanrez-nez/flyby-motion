import React from 'react';
import { behaviors } from '../../../src/index';
import { type FeatureMode } from '../../shared/components/TwoDFeatureDemo';
import { TwoDFeatureDemo } from '../../shared/components/TwoDFeatureDemo';
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
    <TwoDFeatureDemo
      config={{ active: 'behaviors', title: 'Behaviors', modes }}
      sidebarConfig={{

        markdown: sidebarMarkdown,
        sources: [{ label: 'demos/behaviors/index.tsx', language: 'tsx', code: sidebarSource }]
      }}
    />
  );
};
