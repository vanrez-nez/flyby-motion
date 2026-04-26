import type { SpatialIndex } from './index';

export interface Bounds3D { x: number; y: number; z: number; w: number; h: number; d: number }

type Entry<T> = { point: [number, number, number]; data: T };
type Children<T> = [
  Octree<T>, Octree<T>, Octree<T>, Octree<T>,
  Octree<T>, Octree<T>, Octree<T>, Octree<T>,
];

export class Octree<T = unknown> implements SpatialIndex<T> {
  private points: Entry<T>[] = [];
  private children: Children<T> | null = null;

  constructor(
    private readonly bounds: Bounds3D,
    private readonly capacity = 8,
  ) {}

  insert(point: number[], data: T): void {
    if (!this.contains(point[0], point[1], point[2])) return;
    if (!this.children) {
      if (this.points.length < this.capacity) {
        this.points.push({ point: [point[0], point[1], point[2]], data });
        return;
      }
      this.subdivide();
    }
    for (const child of this.children!) child.insert(point, data);
  }

  remove(point: number[], data: T): boolean {
    if (!this.contains(point[0], point[1], point[2])) return false;
    if (!this.children) {
      const idx = this.points.findIndex(e => e.data === data);
      if (idx === -1) return false;
      this.points.splice(idx, 1);
      return true;
    }
    for (const child of this.children) {
      if (child.remove(point, data)) {
        if (this.countAll() <= this.capacity) this.merge();
        return true;
      }
    }
    return false;
  }

  query(point: number[], radius: number): T[] {
    if (!this.intersects(point[0], point[1], point[2], radius)) return [];
    const r2 = radius * radius;
    const result: T[] = [];
    if (!this.children) {
      for (const { point: p, data } of this.points) {
        const dx = p[0] - point[0], dy = p[1] - point[1], dz = p[2] - point[2];
        if (dx * dx + dy * dy + dz * dz <= r2) result.push(data);
      }
      return result;
    }
    for (const child of this.children) result.push(...child.query(point, radius));
    return result;
  }

  clear(): void { this.points = []; this.children = null; }

  private contains(x: number, y: number, z: number): boolean {
    const { x: bx, y: by, z: bz, w, h, d } = this.bounds;
    return x >= bx && x < bx + w && y >= by && y < by + h && z >= bz && z < bz + d;
  }

  private intersects(cx: number, cy: number, cz: number, r: number): boolean {
    const { x: bx, y: by, z: bz, w, h, d } = this.bounds;
    const nx = Math.max(bx, Math.min(cx, bx + w));
    const ny = Math.max(by, Math.min(cy, by + h));
    const nz = Math.max(bz, Math.min(cz, bz + d));
    const dx = cx - nx, dy = cy - ny, dz = cz - nz;
    return dx * dx + dy * dy + dz * dz <= r * r;
  }

  private subdivide(): void {
    const { x, y, z, w, h, d } = this.bounds;
    const hw = w / 2, hh = h / 2, hd = d / 2;
    const cap = this.capacity;
    this.children = [
      new Octree({ x: x + hw, y,        z,        w: hw, h: hh, d: hd }, cap),
      new Octree({ x,         y,        z,        w: hw, h: hh, d: hd }, cap),
      new Octree({ x: x + hw, y: y + hh, z,        w: hw, h: hh, d: hd }, cap),
      new Octree({ x,         y: y + hh, z,        w: hw, h: hh, d: hd }, cap),
      new Octree({ x: x + hw, y,        z: z + hd, w: hw, h: hh, d: hd }, cap),
      new Octree({ x,         y,        z: z + hd, w: hw, h: hh, d: hd }, cap),
      new Octree({ x: x + hw, y: y + hh, z: z + hd, w: hw, h: hh, d: hd }, cap),
      new Octree({ x,         y: y + hh, z: z + hd, w: hw, h: hh, d: hd }, cap),
    ];
    for (const e of this.points) for (const c of this.children!) c.insert(e.point, e.data);
    this.points = [];
  }

  private countAll(): number {
    if (!this.children) return this.points.length;
    return this.children.reduce((s, c) => s + c.countAll(), 0);
  }

  private merge(): void {
    const all: Entry<T>[] = [];
    this.collectAll(all);
    this.children = null;
    this.points = all;
  }

  private collectAll(out: Entry<T>[]): void {
    if (!this.children) { out.push(...this.points); return; }
    for (const c of this.children) c.collectAll(out);
  }
}
