import {
  behaviors,
  forces,
  modifiers,
} from '../../src/index';
import { mountThreeDemo, type ThreeMode } from '../3d/mountThreeDemo';

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

await mountThreeDemo({
  active: 'three-behaviors',
  paneTitle: '3D Behaviors',
  modes,
});
