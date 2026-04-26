# Task 07 — Compositions

## Objective
Implement named convenience compositions built from primitives and combinators.

## Deliverables
- `src/lib/compositions.ts`

## API
```ts
export function arrive(targetFn: () => number[], opts: { k?: number; damp?: number; slowR?: number }): Contributor
export function orbit(centerFn: () => number[], opts: { attractK?: number; tangentK?: number; damp?: number }): Contributor
export function flee(sourceFn: () => number[], opts: { k?: number; damp?: number }): Contributor
export function pursue(leaderFn: () => number[], opts: { k?: number; damp?: number; lookahead?: number }): Contributor
```

## Definitions
- `arrive` = `attract(targetFn, mag.arrive(...))` + `damp(...)`
- `orbit` = `attract(centerFn, ...)` + `tangential(...)` + `damp(...)`
- `flee` = `repel(sourceFn, ...)` + `damp(...)`
- `pursue` = `attract` with extrapolated thunk: `leaderPos + leaderVel * lookahead`

## Acceptance Criteria
1. `arrive` slows and stops at target (velocity magnitude → 0).
2. `orbit` produces circular/elliptical trajectory around center.
3. `flee` increases distance from source over time.
4. `pursue` intercepts a moving target more efficiently than direct `attract`.
5. Each composition is documented as the primitive sum it equals.

## Depends on
- 04-primitives.md
- 05-magnitudes.md
- 06-combinators.md
