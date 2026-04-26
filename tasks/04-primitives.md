# Task 04 — Primitives

## Objective
Implement the closed set of primitive force contributors.

## Deliverables
- `src/lib/primitives/attract.ts`
- `src/lib/primitives/repel.ts`
- `src/lib/primitives/damp.ts`
- `src/lib/primitives/oscillate.ts`
- `src/lib/primitives/constant.ts`
- `src/lib/primitives/tangential.ts` (2D and 3D variants)
- `src/lib/primitives/index.ts`

## API Shape
```ts
type Contributor = (agent: Agent, world: Record<string, unknown>, t: number, dt: number) => number[]
```

### attract(targetFn, magFn?) — pull toward dynamic point
### repel(sourceFn, magFn?) — push from dynamic point
### damp(coefficient) — velocity-opposing force
### oscillate(direction, amplitude, freq, phase?) — time-coupled sinusoidal force
### constant(vec) — fixed directional force
### tangential(k) (2D) / tangentialAround(axis, k) (3D) — perpendicular-to-velocity force

## Acceptance Criteria
1. `attract(() => target)` pulls agent toward target with force direction = target - position.
2. `repel(() => source)` pushes agent away with force direction = position - source.
3. `damp(0.9)` force is `-velocity * 0.9`.
4. `oscillate([1,0], 10, 2)` produces sinusoidal force in x direction over time.
5. `constant([0,-9.8])` always returns `[0,-9.8]` regardless of state.
6. `tangential` is perpendicular to velocity (dot(tangentialForce, velocity) ≈ 0).
7. All primitives return new arrays (do not mutate agent state directly).

## Depends on
- 01-kernel-vectors.md
- 02-kernel-agent.md
- 03-kernel-step.md
