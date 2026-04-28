import React from 'react';
import {
  falloff,
  forces,
  modifiers,
  Vector2Fn,
  type Force,
} from '../../../src/index';
import { type FeatureMode } from '../../shared/components/TwoDFeatureDemo';
import { TwoDFeatureDemo } from '../../shared/components/TwoDFeatureDemo';
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
    <TwoDFeatureDemo
      config={{ active: 'modifiers', title: 'Modifiers', modes }}
      sidebarConfig={{

        markdown: sidebarMarkdown,
        sources: [{ label: 'demos/modifiers/index.tsx', language: 'tsx', code: sidebarSource }]
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
