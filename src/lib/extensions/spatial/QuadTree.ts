import type { SpatialIndex } from './index';

export interface Bounds2D { x: number; y: number; w: number; h: number }

type Entry<T> = { point: [number, number]; data: T };

export class QuadTree<T = unknown> implements SpatialIndex<T> {
  private points: Entry<T>[] = [];
  private children: [QuadTree<T>, QuadTree<T>, QuadTree<T>, QuadTree<T>] | null = null;

  constructor(
    private readonly bounds: Bounds2D,
    private readonly capacity = 8,
  ) {}

  insert(point: number[], data: T): void {
    if (!this.contains(point[0], point[1])) return;
    if (!this.children) {
      if (this.points.length < this.capacity) {
        this.points.push({ point: [point[0], point[1]], data });
        return;
      }
      this.subdivide();
    }
    for (const child of this.children!) child.insert(point, data);
  }

  remove(point: number[], data: T): boolean {
    if (!this.contains(point[0], point[1])) return false;
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
    if (!this.intersects(point[0], point[1], radius)) return [];
    const r2 = radius * radius;
    const result: T[] = [];
    if (!this.children) {
      for (const { point: p, data } of this.points) {
        const dx = p[0] - point[0], dy = p[1] - point[1];
        if (dx * dx + dy * dy <= r2) result.push(data);
      }
      return result;
    }
    for (const child of this.children) result.push(...child.query(point, radius));
    return result;
  }

  clear(): void { this.points = []; this.children = null; }

  private contains(x: number, y: number): boolean {
    const { x: bx, y: by, w, h } = this.bounds;
    return x >= bx && x < bx + w && y >= by && y < by + h;
  }

  private intersects(cx: number, cy: number, r: number): boolean {
    const { x: bx, y: by, w, h } = this.bounds;
    const nx = Math.max(bx, Math.min(cx, bx + w));
    const ny = Math.max(by, Math.min(cy, by + h));
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy <= r * r;
  }

  private subdivide(): void {
    const { x, y, w, h } = this.bounds;
    const hw = w / 2, hh = h / 2;
    const cap = this.capacity;
    this.children = [
      new QuadTree({ x: x + hw, y,        w: hw, h: hh }, cap), // NE
      new QuadTree({ x,         y,        w: hw, h: hh }, cap), // NW
      new QuadTree({ x: x + hw, y: y + hh, w: hw, h: hh }, cap), // SE
      new QuadTree({ x,         y: y + hh, w: hw, h: hh }, cap), // SW
    ];
    for (const e of this.points) for (const c of this.children) c.insert(e.point, e.data);
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
