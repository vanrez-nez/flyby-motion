# Task 09 — Spatial Index

## Objective
Implement spatial indexing for group behaviors (neighborhood queries).

## Deliverables
- `src/lib/extensions/spatial/Grid.ts`
- `src/lib/extensions/spatial/QuadTree.ts` (2D)
- `src/lib/extensions/spatial/Octree.ts` (3D)

## API
```ts
interface SpatialIndex {
  insert(point: number[], data: any): void
  remove(point: number[], data: any): boolean
  query(point: number[], radius: number): any[]
  clear(): void
}
```

## Acceptance Criteria
1. `insert` + `query` returns all items within radius.
2. `remove` deletes the exact item; `query` no longer returns it.
3. `clear` empties the index.
4. QuadTree splits at capacity and merges on removal.
5. Grid uses fixed cell size; query checks neighboring cells.
6. Octree is the 3D analog of QuadTree.
7. Performance: querying 1000 items is faster than brute-force by at least 5x.

## Depends on
- 01-kernel-vectors.md
