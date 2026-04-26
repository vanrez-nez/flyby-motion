import type { SpatialIndex } from './index';

type Entry<T> = { point: number[]; data: T };

export class Grid<T = unknown> implements SpatialIndex<T> {
  private cells = new Map<string, Entry<T>[]>();

  constructor(private readonly cellSize: number) {}

  private key(point: number[]): string {
    return point.map(c => Math.floor(c / this.cellSize)).join(',');
  }

  insert(point: number[], data: T): void {
    const k = this.key(point);
    if (!this.cells.has(k)) this.cells.set(k, []);
    this.cells.get(k)!.push({ point, data });
  }

  remove(point: number[], data: T): boolean {
    const k = this.key(point);
    const bucket = this.cells.get(k);
    if (!bucket) return false;
    const idx = bucket.findIndex(e => e.data === data);
    if (idx === -1) return false;
    bucket.splice(idx, 1);
    if (bucket.length === 0) this.cells.delete(k);
    return true;
  }

  query(point: number[], radius: number): T[] {
    const cs = this.cellSize;
    const r2 = radius * radius;
    const dim = point.length;

    const minC = point.map(c => Math.floor((c - radius) / cs));
    const maxC = point.map(c => Math.floor((c + radius) / cs));

    const result: T[] = [];
    this.iterateCells(minC, maxC, 0, [], (key) => {
      const bucket = this.cells.get(key);
      if (!bucket) return;
      for (const { point: p, data } of bucket) {
        let d2 = 0;
        for (let i = 0; i < dim; i++) d2 += (p[i] - point[i]) ** 2;
        if (d2 <= r2) result.push(data);
      }
    });

    return result;
  }

  private iterateCells(
    min: number[], max: number[], depth: number, coords: number[],
    cb: (key: string) => void,
  ): void {
    if (depth === min.length) { cb(coords.join(',')); return; }
    for (let i = min[depth]; i <= max[depth]; i++) {
      coords[depth] = i;
      this.iterateCells(min, max, depth + 1, coords, cb);
    }
  }

  clear(): void { this.cells.clear(); }
}
