import React from 'react';
import {
  falloff,
  forces,
  modifiers,
  Vector2Fn,
  type Force,
} from '../../../src/index';
import {
  demoColors,
  drawMarker,
  drawRadiusRing,
} from '../../shared/2dHelpers';
import { type FeatureMode } from '../../shared/components/2dFeatureDemo';
import { FeatureDemo2D } from '../../shared/components/2dFeatureDemo';
import sidebarMarkdown from './info.md?raw';
import sidebarSource from './index.tsx?raw';

const idleHomeByAgent = new WeakMap<object, [number, number]>();
const idleSeedByAgent = new WeakMap<object, { x: number; y: number }>();

const modes: FeatureMode[] = [
  {
    value: 'idleDisturbance',
    label: 'idle disturbance',
    presentation: 'none',
    trackPointer: true,
    agentCount: 1,
    maxSpeed: 700,
    maxForce: 3600,
    controls: [
      {
        type: 'options',
        id: 'idleForce',
        folder: 'Idle',
        value: 'oscillate',
        options: {
          drift: 'drift',
          oscillate: 'oscillate',
        },
      },
      { id: 'idleStrength', folder: 'Idle', value: 420, min: 0, max: 420, step: 5 },
      { id: 'idleScale', folder: 'Idle', value: 0.50, min: 0.05, max: 1.5, step: 0.05 },
      { type: 'boolean', id: 'idleX', label: 'idle x', folder: 'Idle', value: false },
      { type: 'boolean', id: 'idleY', label: 'idle y', folder: 'Idle', value: true },
      { id: 'homeStrength', folder: 'Home', value: 12, min: 0.2, max: 12, step: 0.1 },
      { id: 'damp', folder: 'Home', value: 5.5, min: 0, max: 14, step: 0.1 },
      { id: 'mouseRadius', folder: 'Mouse', value: 180, min: 60, max: 360, step: 5 },
      { id: 'mouseStrength', folder: 'Mouse', value: 1900, min: 0, max: 5200, step: 50 },
      { id: 'agentMass', folder: 'Agent', value: 0.20, min: 0.05, max: 2, step: 0.05 },
    ],
    configureAgent: (entry, _scene, values) => {
      entry.agent.mass = values.agentMass as number;
      idleHomeByAgent.set(entry.agent, [entry.agent.position[0], entry.agent.position[1]]);
      idleSeedByAgent.set(entry.agent, {
        x: Math.random() * 10000,
        y: Math.random() * 10000,
      });
    },
    afterStep: (entry, _scene, values) => {
      entry.agent.mass = values.agentMass as number;
    },
    buildForces: (entry, scene, values) => {
      const home = getIdleHome(entry.agent);
      const mouseRadius = values.mouseRadius as number;
      const mousePoint = () => [scene.mouse.x, scene.mouse.y];
      const mouseActiveForAgent = (agent: { position: number[] }) =>
        scene.mouse.active && Vector2Fn.distance(agent.position, mousePoint()) <= mouseRadius;
      const homeSpring = forces.attract(
        () => home,
        (d) => d * (values.homeStrength as number),
      );
      const mouseRepel = modifiers.gate(
        mouseActiveForAgent,
        forces.repel(mousePoint, falloff.constant(values.mouseStrength as number)),
      );
      const idleX = values.idleX as boolean;
      const idleY = values.idleY as boolean;
      const idleSeeds = getIdleSeeds(entry.agent);
      const idleForce = values.idleForce === 'drift'
        ? forces.drift({
            strength: values.idleStrength as number,
            scale: values.idleScale as number,
            x: idleX ? { seed: idleSeeds.x } : false,
            y: idleY ? { seed: idleSeeds.y } : false,
          })
        : buildOscillateIdleForce(
            values.idleStrength as number,
            values.idleScale as number,
            idleX,
            idleY,
          );

      return [
        modifiers.sum(
          idleForce,
          homeSpring,
          mouseRepel,
          forces.damp(values.damp as number),
        ),
      ];
    },
    drawOverlay: (graphics, scene, values) => {
      const [cx, cy] = scene.center();
      const mouseRadius = values.mouseRadius as number;

      drawMarker(graphics, cx, cy, demoColors.agent);

      if (scene.mouse.active) {
        drawRadiusRing(graphics, scene.mouse.x, scene.mouse.y, mouseRadius, demoColors.force);
        drawMarker(graphics, scene.mouse.x, scene.mouse.y, demoColors.force);
      }
    },
  },
  {
    value: 'targetCapture',
    label: 'target capture',
    presentation: 'none',
    trackPointer: true,
    agentCount: 1,
    maxSpeed: 900,
    maxForce: 3200,
    controls: [
      { id: 'targetRadius', folder: 'Target', value: 150, min: 50, max: 320, step: 5 },
      { id: 'targetStrength', folder: 'Target', value: 3000, min: 500, max: 6000, step: 50 },
      { id: 'targetSlowR', label: 'target slow r', folder: 'Target', value: 50, min: 10, max: 180, step: 5 },
      { id: 'centerRadius', folder: 'Center', value: 150, min: 50, max: 320, step: 5 },
      { id: 'centerStrength', folder: 'Center', value: 1800, min: 300, max: 4200, step: 50 },
      { id: 'damp', folder: 'Agent', value: 5, min: 0, max: 14, step: 0.1 },
      { id: 'agentMass', folder: 'Agent', value: 0.2, min: 0.05, max: 2, step: 0.05 },
    ],
    configureAgent: (entry, _scene, values) => {
      entry.agent.mass = values.agentMass as number;
    },
    afterStep: (entry, _scene, values) => {
      entry.agent.mass = values.agentMass as number;
    },
    buildForces: (_entry, scene, values) => {
      const targetRadius = values.targetRadius as number;
      const centerRadius = values.centerRadius as number;
      const targetPoint = () => [scene.mouse.x, scene.mouse.y];
      const isTargetInsideCenter = () => Vector2Fn.distance(targetPoint(), scene.center()) <= centerRadius;
      const isTargetCaptureActive = (agent: { position: number[] }) =>
        scene.mouse.active &&
        isTargetInsideCenter() &&
        Vector2Fn.distance(agent.position, targetPoint()) <= targetRadius;
      const centerForce = modifiers.gate(
        (agent) => !isTargetCaptureActive(agent),
        forces.attract(
          scene.center,
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
    drawOverlay: (graphics, scene, values) => {
      const [cx, cy] = scene.center();
      const targetRadius = values.targetRadius as number;
      const centerRadius = values.centerRadius as number;

      drawRadiusRing(graphics, cx, cy, centerRadius, demoColors.target);
      drawMarker(graphics, cx, cy, demoColors.target);

      if (scene.mouse.active) {
        drawRadiusRing(graphics, scene.mouse.x, scene.mouse.y, targetRadius, demoColors.force);
        drawMarker(graphics, scene.mouse.x, scene.mouse.y, demoColors.force);
      }
    },
  },
  {
    value: 'keepDistance',
    label: 'keepDistance',
    presentation: 'none',
    trackPointer: true,
    agentCount: 1,
    maxSpeed: 900,
    maxForce: 3200,
    controls: [
      { id: 'desiredRadius', folder: 'Mouse', value: 150, min: 40, max: 360, step: 5 },
      { id: 'stiffness', folder: 'Mouse', value: 18, min: 1, max: 60, step: 1 },
      { id: 'damp', folder: 'Agent', value: 5, min: 0, max: 14, step: 0.1 },
      { id: 'agentMass', folder: 'Agent', value: 0.2, min: 0.05, max: 2, step: 0.05 },
    ],
    configureAgent: (entry, _scene, values) => {
      entry.agent.mass = values.agentMass as number;
    },
    afterStep: (entry, _scene, values) => {
      entry.agent.mass = values.agentMass as number;
    },
    buildForces: (_entry, scene, values) => [
      modifiers.sum(
        keepDistanceFromMouse(
          () => [scene.mouse.x, scene.mouse.y],
          values.desiredRadius as number,
          values.stiffness as number,
        ),
        forces.damp(values.damp as number),
      ),
    ],
    drawOverlay: (graphics, scene, values) => {
      if (!scene.mouse.active) return;

      drawRadiusRing(
        graphics,
        scene.mouse.x,
        scene.mouse.y,
        values.desiredRadius as number,
        demoColors.force,
      );
      drawMarker(graphics, scene.mouse.x, scene.mouse.y, demoColors.force);
    },
  },
];

export const Custom2DDemo: React.FC = () => {
  return (
    <FeatureDemo2D
      config={{ active: 'custom', title: 'Custom', modes }}
      sidebarConfig={{

        markdown: sidebarMarkdown,
        sources: [{ label: 'demos/custom/index.tsx', language: 'tsx', code: sidebarSource }]
      }}
    />
  );
};

function getIdleHome(agent: object): [number, number] {
  const home = idleHomeByAgent.get(agent);
  if (!home) throw new Error('Missing idle home for custom demo agent');
  return home;
}

function getIdleSeeds(agent: object): { x: number; y: number } {
  const seeds = idleSeedByAgent.get(agent);
  if (!seeds) throw new Error('Missing idle seeds for custom demo agent');
  return seeds;
}

function buildOscillateIdleForce(
  strength: number,
  scale: number,
  idleX: boolean,
  idleY: boolean,
): Force {
  const axisForces: Force[] = [];
  if (idleX) axisForces.push(forces.oscillate([1, 0], strength, scale));
  if (idleY) axisForces.push(forces.oscillate([0, 1], strength, scale * 0.65, Math.PI / 2));

  if (axisForces.length === 0) return forces.constant([0, 0]);
  return modifiers.sum(...axisForces);
}

function keepDistanceFromMouse(
  mouseFn: () => number[],
  desiredRadius: number,
  stiffness: number,
): Force {
  return (agent) => {
    const delta = [0, 0];
    Vector2Fn.subtract(delta, mouseFn(), agent.position);
    const currentDistance = Vector2Fn.length(delta);
    if (currentDistance < 0.001) return [0, 0];

    Vector2Fn.normalize(delta, delta);
    const distanceError = currentDistance - desiredRadius;
    return Vector2Fn.scale(delta, delta, distanceError * stiffness);
  };
}
