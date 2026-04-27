import {
  falloff,
  forces,
  modifiers,
  type Force,
} from '../../src/index';
import { mountFeatureDemo, type FeatureMode } from '../shared/twoDDemo';

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
        (agent) => distance(agent.position, [scene.source.x, scene.source.y]) < (v.range as number),
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

await mountFeatureDemo({
  active: 'modifiers',
  title: 'Modifiers',
  modes,
});

function baseAttract(scene: { target: { x: number; y: number } }): Force {
  return forces.attract(
    () => [scene.target.x, scene.target.y],
    falloff.arrive(900, 180),
  );
}

function customForce(targetFn: () => number[], strength: number, wobble: number): Force {
  return (agent, _world, t) => {
    const target = targetFn();
    const dx = target[0] - agent.position[0];
    const dy = target[1] - agent.position[1];
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) return [0, 0];
    const nx = dx / dist;
    const ny = dy / dist;
    const side = Math.sin(t * 3) * wobble;
    return [
      nx * strength - ny * side,
      ny * strength + nx * side,
    ];
  };
}

function distance(a: number[], b: number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
