import * as Vector2Fn from './Vector2Fn';
import * as Vector3Fn from './Vector3Fn';

export type VecModule = {
  add(out: number[], a: number[], b: number[]): number[];
  subtract(out: number[], a: number[], b: number[]): number[];
  scale(out: number[], a: number[], b: number): number[];
  normalize(out: number[], a: number[]): number[];
  length(a: number[]): number;
  dot(a: number[], b: number[]): number;
};

export function getVec(dim: number): VecModule {
  if (dim === 2) return Vector2Fn;
  if (dim === 3) return Vector3Fn;
  throw new RangeError(`Unsupported vector dimension: ${dim}`);
}
