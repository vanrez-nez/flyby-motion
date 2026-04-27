import {
  falloff,
  forces,
  modifiers,
  Vector2Fn,
  type Force,
} from '../../src/index';
import {
  demoColors,
  drawMarker,
  drawRadiusRing,
} from '../shared/drawables';
import { mountFeatureDemo, type FeatureMode } from '../shared/twoDDemo';

const modes: FeatureMode[] = [
  {
    value: 'mouseCapture',
    label: 'mouseCapture',
    presentation: 'none',
    trackPointer: true,
    agentCount: 1,
    maxSpeed: 900,
    maxForce: 3200,
    controls: [
      { id: 'mouseRadius', folder: 'Mouse', value: 150, min: 50, max: 320, step: 5 },
      { id: 'mouseStrength', folder: 'Mouse', value: 3000, min: 500, max: 6000, step: 50 },
      { id: 'mouseSlowR', folder: 'Mouse', value: 50, min: 10, max: 180, step: 5 },
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
      const mouseRadius = values.mouseRadius as number;
      const centerRadius = values.centerRadius as number;
      const mousePoint = () => [scene.mouse.x, scene.mouse.y];
      const isMouseInsideCenter = () => distance(mousePoint(), scene.center()) <= centerRadius;
      const isMouseCaptureActive = (agent: { position: number[] }) =>
        scene.mouse.active &&
        isMouseInsideCenter() &&
        distance(agent.position, mousePoint()) <= mouseRadius;
      const centerForce = modifiers.gate(
        (agent) => !isMouseCaptureActive(agent),
        forces.attract(
          scene.center,
          falloff.arrive(values.centerStrength as number, centerRadius),
        ),
      );
      const mouseForce = modifiers.gate(
        isMouseCaptureActive,
        forces.attract(
          mousePoint,
          falloff.arrive(values.mouseStrength as number, values.mouseSlowR as number),
        ),
      );

      return [
        modifiers.sum(
          centerForce,
          mouseForce,
          forces.damp(values.damp as number),
        ),
      ];
    },
    drawOverlay: (graphics, scene, values) => {
      const [cx, cy] = scene.center();
      const mouseRadius = values.mouseRadius as number;
      const centerRadius = values.centerRadius as number;

      drawRadiusRing(graphics, cx, cy, centerRadius, demoColors.target);
      drawMarker(graphics, cx, cy, demoColors.target);

      if (scene.mouse.active) {
        drawRadiusRing(graphics, scene.mouse.x, scene.mouse.y, mouseRadius, demoColors.force);
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

await mountFeatureDemo({
  active: 'custom',
  title: 'Custom',
  modes,
});

function distance(a: number[], b: number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
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
