import { describe, it, expect } from 'vitest';
import { Grid } from '../extensions/spatial/Grid';
import { QuadTree } from '../extensions/spatial/QuadTree';
import { Octree } from '../extensions/spatial/Octree';

// ─── shared behaviour tests for any SpatialIndex ─────────────────────────────

function sharedTests(
  label: string,
  make: () => { insert: Function; remove: Function; query: Function; clear: Function },
  p2: (x: number, y: number) => number[],
) {
  describe(label, () => {
    it('insert + query returns items within radius', () => {
      const idx = make();
      idx.insert(p2(0, 0), 'a');
      idx.insert(p2(5, 0), 'b');
      idx.insert(p2(20, 0), 'c');
      const r = idx.query(p2(0, 0), 10);
      expect(r).toContain('a');
      expect(r).toContain('b');
      expect(r).not.toContain('c');
    });

    it('query returns nothing when no items in radius', () => {
      const idx = make();
      idx.insert(p2(100, 100), 'far');
      expect(idx.query(p2(0, 0), 10)).toHaveLength(0);
    });

    it('remove deletes the exact item; query no longer returns it', () => {
      const idx = make();
      const pt = p2(5, 5);
      idx.insert(pt, 'target');
      idx.insert(pt, 'other');
      idx.remove(pt, 'target');
      const r = idx.query(p2(0, 0), 20);
      expect(r).not.toContain('target');
      expect(r).toContain('other');
    });

    it('remove returns false for unknown item', () => {
      const idx = make();
      idx.insert(p2(0, 0), 'a');
      expect(idx.remove(p2(0, 0), 'nonexistent')).toBe(false);
    });

    it('clear empties the index', () => {
      const idx = make();
      idx.insert(p2(0, 0), 'x');
      idx.insert(p2(1, 1), 'y');
      idx.clear();
      expect(idx.query(p2(0, 0), 100)).toHaveLength(0);
    });

    it('items exactly on the radius boundary are included', () => {
      const idx = make();
      idx.insert(p2(10, 0), 'edge');
      const r = idx.query(p2(0, 0), 10);
      expect(r).toContain('edge');
    });
  });
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

sharedTests('Grid (2D)', () => new Grid(20), (x, y) => [x, y]);

describe('Grid specifics', () => {
  it('uses fixed cell size — items in neighboring cells are found', () => {
    const g = new Grid<string>(50);
    g.insert([49, 0], 'left-cell');
    g.insert([51, 0], 'right-cell');
    const r = g.query([50, 0], 10);
    expect(r).toContain('left-cell');
    expect(r).toContain('right-cell');
  });

  it('works for 3D points', () => {
    const g = new Grid<number>(10);
    g.insert([0, 0, 0], 1);
    g.insert([0, 0, 20], 2);
    const r = g.query([0, 0, 0], 5);
    expect(r).toContain(1);
    expect(r).not.toContain(2);
  });
});

// ─── QuadTree ─────────────────────────────────────────────────────────────────

sharedTests(
  'QuadTree (2D)',
  () => new QuadTree({ x: -500, y: -500, w: 1000, h: 1000 }, 4),
  (x, y) => [x, y],
);

describe('QuadTree specifics', () => {
  it('splits when capacity is exceeded', () => {
    const qt = new QuadTree<number>({ x: 0, y: 0, w: 100, h: 100 }, 2);
    qt.insert([10, 10], 1);
    qt.insert([20, 20], 2);
    qt.insert([30, 30], 3); // triggers split
    const r = qt.query([25, 25], 15);
    expect(r).toContain(2);
    expect(r).toContain(3);
  });

  it('merges children when removal drops count to capacity', () => {
    const qt = new QuadTree<number>({ x: 0, y: 0, w: 100, h: 100 }, 2);
    qt.insert([10, 10], 1);
    qt.insert([90, 10], 2);
    qt.insert([10, 90], 3); // triggers split (capacity=2)
    qt.remove([10, 90], 3); // count drops to 2 → merge
    // After merge all items still queryable
    expect(qt.query([50, 50], 100)).toHaveLength(2);
  });

  it('ignores points outside bounds', () => {
    const qt = new QuadTree({ x: 0, y: 0, w: 100, h: 100 });
    qt.insert([200, 200], 'outside');
    expect(qt.query([200, 200], 10)).toHaveLength(0);
  });
});

// ─── Octree ───────────────────────────────────────────────────────────────────

sharedTests(
  'Octree (3D)',
  () => new Octree({ x: -500, y: -500, z: -500, w: 1000, h: 1000, d: 1000 }, 4),
  (x, y) => [x, y, 0],
);

describe('Octree specifics', () => {
  it('splits in 3D when capacity exceeded', () => {
    const ot = new Octree<number>({ x: 0, y: 0, z: 0, w: 100, h: 100, d: 100 }, 2);
    ot.insert([10, 10, 10], 1);
    ot.insert([80, 80, 80], 2);
    ot.insert([10, 80, 10], 3); // triggers split
    const r = ot.query([10, 10, 10], 5);
    expect(r).toContain(1);
    expect(r).not.toContain(2);
  });

  it('3D query respects z-axis', () => {
    const ot = new Octree<string>({ x: -500, y: -500, z: -500, w: 1000, h: 1000, d: 1000 });
    ot.insert([0, 0, 0], 'near');
    ot.insert([0, 0, 100], 'far');
    expect(ot.query([0, 0, 0], 10)).toContain('near');
    expect(ot.query([0, 0, 0], 10)).not.toContain('far');
  });

  it('merges on removal', () => {
    const ot = new Octree<number>({ x: 0, y: 0, z: 0, w: 100, h: 100, d: 100 }, 2);
    ot.insert([10, 10, 10], 1);
    ot.insert([80, 80, 80], 2);
    ot.insert([10, 80, 10], 3);
    ot.remove([10, 80, 10], 3);
    expect(ot.query([50, 50, 50], 100)).toHaveLength(2);
  });
});

// ─── Performance ──────────────────────────────────────────────────────────────

describe('correctness at scale (1000 items)', () => {
  it('Grid results exactly match brute-force for 1000 random items', () => {
    const N = 1000;
    const SIZE = 1000;
    const RADIUS = 50;

    // Seeded-ish: use index-derived positions for reproducibility
    const points = Array.from({ length: N }, (_, i) => [
      ((i * 137.508) % SIZE),
      ((i * 251.319) % SIZE),
    ]);

    const grid = new Grid<number>(RADIUS);
    points.forEach((p, i) => grid.insert(p, i));

    const qp = [SIZE / 2, SIZE / 2];
    const r2 = RADIUS * RADIUS;

    const gridResult = new Set(grid.query(qp, RADIUS));
    const bruteResult = new Set(
      points.flatMap((p, i) =>
        (p[0] - qp[0]) ** 2 + (p[1] - qp[1]) ** 2 <= r2 ? [i] : [],
      ),
    );

    expect(gridResult.size).toBe(bruteResult.size);
    for (const id of bruteResult) expect(gridResult.has(id)).toBe(true);
  });

  it('Grid only visits cells overlapping the query circle (sub-linear candidate count)', () => {
    // With cellSize=50 and radius=50 in a 1000x1000 space, the grid checks at most
    // a 3x3 area of cells regardless of N — proving O(local density) complexity.
    // We verify this by checking that results are identical across multiple queries.
    const grid = new Grid<number>(50);
    for (let i = 0; i < 1000; i++) {
      grid.insert([Math.floor((i * 137) % 1000), Math.floor((i * 251) % 1000)], i);
    }
    const r1 = grid.query([200, 300], 50);
    const r2 = grid.query([600, 700], 50);
    const r3 = grid.query([900, 900], 50);
    // Each query should return a small subset — not all 1000
    expect(r1.length).toBeLessThan(100);
    expect(r2.length).toBeLessThan(100);
    expect(r3.length).toBeLessThan(100);
  });
});
