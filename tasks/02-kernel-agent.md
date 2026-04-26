# Task 02 — Agent

## Objective
Implement the Agent class that holds kinematic state and a bag of contributors.

## Deliverables
- `src/lib/Agent.ts`

## API
```ts
class Agent {
  position: number[]   // Vec2 or Vec3
  velocity: number[]   // Vec2 or Vec3
  mass: number
  maxSpeed: number
  maxForce: number
  contributors: Set<Contributor>

  add(c: Contributor, opts?: { label?: string }): Contributor
  remove(c: Contributor): boolean
  clear(): void
}
```

## Acceptance Criteria
1. Agent can be constructed with default or explicit state.
2. `agent.add(c)` returns `c` and stores it in `contributors`.
3. `agent.remove(c)` removes it; returns `false` if not present.
4. `agent.clear()` empties the contributor set.
5. Optional `label` metadata is stored but ignored by the kernel.
6. Agent state is mutable only through own properties (contributors must not mutate agent directly).

## Depends on
- 01-kernel-vectors.md
