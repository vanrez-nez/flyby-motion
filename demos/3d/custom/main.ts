import {
  falloff,
  forces,
  modifiers,
  Vector3Fn,
  type Force,
} from '../../../src/index';
import { mountThreeDemo, type ThreeMode } from '../mountThreeDemo';
import { mountDemoSidebar } from '../../shared/demoSidebar';
import sidebarMarkdown from './info.md?raw';
import sidebarSource from './main.ts?raw';

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

await mountThreeDemo({
  active: 'three-custom',
  paneTitle: '3D Custom',
  modes,
});

mountDemoSidebar({
  storageKey: 'flyby:sidebar:three-custom',
  markdown: sidebarMarkdown,
  sources: [{ label: 'demos/3d-custom/main.ts', language: 'typescript', code: sidebarSource }],
});

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
