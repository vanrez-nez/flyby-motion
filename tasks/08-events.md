# Task 08 — Lifecycle Events

## Objective
Add a minimal event emitter to Agent for kernel-adjacent observability.

## Deliverables
- `src/lib/extensions/events.ts`

## API
```ts
interface EventEmitter {
  on(event: string, handler: (...args: any[]) => void): () => void
  off(event: string, handler: (...args: any[]) => void): void
  emit(event: string, ...args: any[]): void
}

// Agent integration
agent.on('step:before', (agent, world, t, dt) => {})
agent.on('step:after', (agent, world, t, dt) => {})
agent.on('contributor:added', (contributor) => {})
agent.on('contributor:removed', (contributor) => {})
agent.on('force:applied', (totalForce) => {}) // debug-only
```

## Acceptance Criteria
1. `agent.on` returns an unsubscribe function.
2. Events fire in order: `step:before` → contributors → `force:applied` (if opt-in) → integration → `step:after`.
3. `contributor:added` fires on `agent.add(c)`.
4. `contributor:removed` fires on `agent.remove(c)`.
5. Removing a listener during emit does not skip remaining listeners.
6. No external dependency; implemented in ~30 lines.

## Depends on
- 02-kernel-agent.md
- 03-kernel-step.md
