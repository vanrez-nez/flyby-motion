# Task 01 — Kernel Vectors (Vector2, Vector3, Fn modules)

## Objective
Port the reference Vec2/Vec3 implementations into the library as typed TypeScript modules with the same separation: mutable class wrappers and pure functional modules.

## Deliverables
- `src/lib/utils/Vector2.ts` — class extending Array<number>
- `src/lib/utils/Vector2Fn.ts` — pure functions operating on `number[]`
- `src/lib/utils/Vector3.ts` — class extending Array<number>
- `src/lib/utils/Vector3Fn.ts` — pure functions operating on `number[]`

## Acceptance Criteria (testable)
1. `npm run build` compiles with zero TS errors.
2. Generated `.d.ts` files export all functions and classes.
3. `Vector2` and `Vector3` classes have `x`, `y`, `z` getters/setters.
4. All reference operations exist: add, sub, scale, normalize, dot, cross (3D), lerp, smoothLerp, transformMat3, transformMat4, transformQuat (3D), angle (3D).
5. `Vector2Fn.cross` returns a scalar; `Vector3Fn.cross` returns a `number[]`.
6. `exactEquals` works for both dimensions.

## Depends on
Nothing — this is the foundation task.
