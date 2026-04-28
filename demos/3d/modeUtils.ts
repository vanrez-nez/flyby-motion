import type * as THREE from 'three';
import { falloff, type FalloffFn } from '../../src/index';

export type Control =
  | {
      type?: 'number';
      id: string;
      label?: string;
      folder?: string;
      value: number;
      min: number;
      max: number;
      step: number;
    }
  | {
      type: 'boolean';
      id: string;
      label?: string;
      folder?: string;
      value: boolean;
    }
  | {
      type: 'options';
      id: string;
      label?: string;
      folder?: string;
      value: string;
      options: Record<string, string>;
    };

export type ControlValues = Record<string, number | boolean | string>;
export type PointKey = 'target' | 'source' | 'leader' | 'center';
export type PresentationIntent = 'attract' | 'reject';

export type ModePresentation = {
  point: PointKey;
  intent: PresentationIntent;
  radiusControl?: string;
};

export type PointResolvers = Record<PointKey, () => number[]>;

export const directionMap: Record<string, number[]> = {
  x: [1, 0, 0],
  '-x': [-1, 0, 0],
  y: [0, 1, 0],
  '-y': [0, -1, 0],
  z: [0, 0, 1],
  '-z': [0, 0, -1],
};

export const falloffControls: Control[] = [
  { type: 'options', id: 'falloff', value: 'constant', options: { constant: 'constant', linear: 'linear', invSquare: 'invSquare', arrive: 'arrive', exponential: 'exponential' } },
  { id: 'k', value: 8, min: 0.1, max: 40, step: 0.1 },
  { id: 'eps', value: 0.05, min: 0.001, max: 1, step: 0.001 },
  { id: 'slowR', label: 'slow r', value: 2.4, min: 0.1, max: 8, step: 0.1 },
  { id: 'rate', value: 0.7, min: 0, max: 4, step: 0.05 },
  { id: 'maxR', label: 'max r', value: 0, min: 0, max: 8, step: 0.1 },
  { id: 'minR', label: 'min r', value: 0, min: 0, max: 4, step: 0.1 },
];

export function objectPosition(object: THREE.Object3D): number[] {
  return [object.position.x, object.position.y, object.position.z];
}

export function centerPoint(): number[] {
  return [0, 0.5, 0];
}

export function makePointResolvers(points: {
  target: THREE.Object3D;
  source: THREE.Object3D;
  leader: { position: number[] };
}): PointResolvers {
  return {
    target: () => objectPosition(points.target),
    source: () => objectPosition(points.source),
    leader: () => [...points.leader.position],
    center: centerPoint,
  };
}

export function makeFalloff(controlValues: ControlValues): FalloffFn {
  const kind = controlValues.falloff as string;
  const k = controlValues.k as number;
  let fn: FalloffFn;

  if (kind === 'linear') {
    fn = falloff.linear(k);
  } else if (kind === 'invSquare') {
    fn = falloff.invSquare(k, controlValues.eps as number);
  } else if (kind === 'arrive') {
    fn = falloff.arrive(k, controlValues.slowR as number);
  } else if (kind === 'exponential') {
    fn = falloff.exponential(k, controlValues.rate as number);
  } else {
    fn = falloff.constant(k);
  }

  const maxR = controlValues.maxR as number;
  const minR = controlValues.minR as number;
  if (minR > 0) fn = falloff.beyond(fn, minR);
  if (maxR > 0) fn = falloff.within(fn, maxR);
  return fn;
}

export function numberValue(values: ControlValues, id: string, fallback = 0): number {
  const value = values[id];
  return typeof value === 'number' ? value : fallback;
}

export function optionalRadius(values: ControlValues, id: string | undefined): number | undefined {
  if (!id) return undefined;
  const value = values[id];
  return typeof value === 'number' && value > 0 ? value : undefined;
}

export function controlsToValues(controls: Control[]): ControlValues {
  return Object.fromEntries(controls.map((control) => [control.id, control.value]));
}

export function groupControlsByFolder(controls: Control[], fallbackTitle: string): Map<string, Control[]> {
  const grouped = new Map<string, Control[]>();
  controls.forEach((control) => {
    const title = control.folder ?? fallbackTitle;
    grouped.set(title, [...(grouped.get(title) ?? []), control]);
  });
  return grouped;
}

export function cloneControls(
  controls: Control[],
  overrides: Record<string, number | boolean | string> = {},
): Control[] {
  return controls.map((control) => ({
    ...control,
    value: overrides[control.id] ?? control.value,
  }) as Control);
}
