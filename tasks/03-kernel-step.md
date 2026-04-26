# Task 03 — Step (Integrator)

## Objective
Implement the free-function `step` that evaluates all contributors and advances agent state with semi-implicit Euler integration.

## Deliverables
- `src/lib/step.ts`

## API
```ts
function step(
  agent: Agent,
  world: Record<string, unknown>,
  t: number,
  dt: number
): void
```

## Algorithm
1. Snapshot the contributor set at the start of the call.
2. For each contributor, call `c(agent, world, t, dt)` to get a force vector.
3. Sum all force vectors.
4. Truncate force to `agent.maxForce`.
5. `acceleration = force / mass`
6. `velocity += acceleration * dt`
7. Truncate velocity to `agent.maxSpeed`.
8. `position += velocity * dt`

## Acceptance Criteria
1. `step` runs without error on an Agent with zero contributors (identity case).
2. A constant-force contributor produces position parabolic in time (within float tolerance).
3. Contributor set is snapshotted: removing a contributor mid-step does not affect the current step.
4. `dt` must be positive; throw or clamp if `dt <= 0`.
5. Deterministic: same inputs produce same outputs across runs.

## Depends on
- 01-kernel-vectors.md
- 02-kernel-agent.md
