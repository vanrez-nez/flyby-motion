# Task 06 — Combinators

## Objective
Implement force-on-force operators that transform contributors.

## Deliverables
- `src/lib/combinators.ts`

## API
```ts
export function scale(c: Contributor, k: number): Contributor
export function gate(predicate: (agent: Agent, world: Record<string, unknown>, t: number) => boolean, c: Contributor): Contributor
export function during(start: number, end: number, c: Contributor): Contributor
export function fadeIn(duration: number, c: Contributor): Contributor
export function fadeOut(duration: number, c: Contributor): Contributor
export function combined(...cs: Contributor[]): Contributor
```

## Behavior
- `scale(c, k)` → multiply the force vector from `c` by `k`
- `gate(pred, c)` → returns zero vector when `pred` is false
- `during(start, end, c)` → returns zero vector when `t < start || t > end`
- `fadeIn(duration, c)` → ramps `k` from 0 to 1 over `duration` seconds after first invocation (tracked per contributor instance)
- `fadeOut(duration, c)` → ramps `k` from 1 to 0 over `duration` seconds
- `combined(...cs)` → sums forces from all contributors into one contributor

## Acceptance Criteria
1. `scale(c, 0)` produces zero vector regardless of `c`.
2. `gate(() => false, c)` produces zero vector.
3. `during(1, 2, c)` produces `c` force at `t=1.5`, zero at `t=0` and `t=3`.
4. `fadeIn(1, c)` at `t=0.5` produces half force, full force at `t>=1`.
5. `combined(c1, c2)` total force equals `c1` force + `c2` force.

## Depends on
- 01-kernel-vectors.md
- 02-kernel-agent.md
- 04-primitives.md (for test contributors)
