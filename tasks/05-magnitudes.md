# Task 05 — Magnitude Curves

## Objective
Implement scalar magnitude curves that primitives use to shape force strength over distance.

## Deliverables
- `src/lib/magnitudes.ts`

## API
```ts
export const mag = {
  constant: (k: number) => (distance: number) => number,
  linear: (k: number) => (distance: number) => number,
  invSquare: (k: number, eps?: number) => (distance: number) => number,
  arrive: (k: number, slowR: number) => (distance: number) => number,
  exponential: (k: number, falloff: number) => (distance: number) => number,
  rangeLimit: (fn: (d: number) => number, maxR: number) => (distance: number) => number,
  deadZone: (fn: (d: number) => number, minR: number) => (distance: number) => number,
}
```

## Curve Definitions
- `constant(k)` → force magnitude is always `k`
- `linear(k)` → `k * distance`
- `invSquare(k, eps=0.001)` → `k / (distance² + eps²)`
- `arrive(k, slowR)` → linear ramp from 0 to `slowR`, then constant at `k`
- `exponential(k, falloff)` → `k * exp(-falloff * distance)`
- `rangeLimit(fn, maxR)` → `distance > maxR ? 0 : fn(distance)`
- `deadZone(fn, minR)` → `distance < minR ? 0 : fn(distance)`

## Acceptance Criteria
1. `mag.constant(5)(100) === 5`
2. `mag.linear(2)(3) === 6`
3. `mag.invSquare(1)(1)` ≈ 1 (within 0.01)
4. `mag.arrive(10, 5)(3)` ≈ `6` (ramp: 3/5 * 10)
5. `mag.exponential(10, 0.1)(0)` ≈ 10
6. `mag.rangeLimit(mag.constant(5), 10)(15) === 0`
7. `mag.deadZone(mag.constant(5), 2)(1) === 0`
8. Curves compose: `mag.rangeLimit(mag.deadZone(mag.invSquare(1), 0.5), 20)` works as expected.

## Depends on
- 01-kernel-vectors.md (for distance calculations, if needed)
