import React from 'react';
import { falloff, forces, type FalloffFn } from '../../../src/index';
import { type FeatureMode, type DemoControlValues } from '../../shared/components/2dFeatureDemo';
import { FeatureDemo2D } from '../../shared/components/2dFeatureDemo';
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
        sources: [{ label: 'demos/forces/index.tsx', language: 'tsx', code: sidebarSource }]
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
