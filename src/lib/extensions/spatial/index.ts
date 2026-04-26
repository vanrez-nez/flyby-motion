export interface SpatialIndex<T = unknown> {
  insert(point: number[], data: T): void;
  remove(point: number[], data: T): boolean;
  query(point: number[], radius: number): T[];
  clear(): void;
}

export { Grid } from './Grid';
export { QuadTree } from './QuadTree';
export { Octree } from './Octree';
