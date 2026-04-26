# Task 10 — Framework Adapters

## Objective
Provide thin wiring adapters that sync agent state to renderer transforms.

## Deliverables
- `src/lib/adapters/three.ts` — syncs to Three.js Object3D.position
- `src/lib/adapters/pixi.ts` — syncs to PIXI DisplayObject position
- `src/lib/adapters/dom.ts` — syncs to CSS transform

## API
```ts
// three.ts
export function syncThree(agent: Agent, object: THREE.Object3D, opts?: { scale?: number }): () => void

// pixi.ts
export function syncPixi(agent: AgentWithVec2, displayObject: PIXI.DisplayObject): () => void

// dom.ts
export function syncDom(agent: AgentWithVec2, element: HTMLElement): () => void
```

## Acceptance Criteria
1. After `syncThree(agent, mesh)`, `mesh.position` reflects `agent.position` every frame.
2. Calling the returned function stops syncing.
3. `syncPixi` updates `(x, y)` from agent's first two position components.
4. `syncDom` sets `element.style.transform = translate(x, y)`.
5. Adapters do not depend on each other.
6. Adapters do not mutate agent state.

## Depends on
- 01-kernel-vectors.md
- 02-kernel-agent.md
- 03-kernel-step.md
