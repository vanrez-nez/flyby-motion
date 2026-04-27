# flyby-motion — Architecture Plan

A force-based motion library for JavaScript. Single- and multi-agent state evolved by integrating contributed forces. Small kernel, growing vocabulary, extensions on top.

---

## 1. Purpose & Scope

### What this library is
- A force accumulator and semi-implicit Euler integrator for kinematic agents.
- A vocabulary of preset forces (attractors, repulsors, dampers, oscillators, ...).
- A composition model where every contribution reduces to a force vector.
- 2D and 3D shipped as parallel modules, not as a vector-generic abstraction.

### What this library is not
- A physics engine (no collisions, constraints, joints, rigid bodies).
- A tween or keyframe library (no start/end, no easings as primary concept).
- A trajectory optimizer (no temporal-constraint solving, no inverse dynamics).
- An orientation system (heading is downstream of velocity, not a separate channel).
- A scene graph or renderer.

### Deliberately rejected
- Typed contributions (force vs constraint vs replace). Everything is a force.
- Per-force priority or ordering. The force set is a commutative bag.
- Forces that mutate other forces or agent state directly.
- Built-in spatial indexing in the kernel (provided as an extension).
- Multiple integration schemes. Semi-implicit Euler only.

The point of being explicit about rejections is that they're the design's load-bearing constraints. If a future feature needs one of them relaxed, that's the moment to question whether the feature belongs in this library at all.

---

## 2. Architectural Principles

Three layers, strictly separated:

```
┌────────────────────────────────────────────────────────┐
│  L3 — Extensions   events · debug · spatial            │
├────────────────────────────────────────────────────────┤
│  L2 — Vocabulary   presets · forces · falloff ·    │
│                    modifiers · behaviors          │
├────────────────────────────────────────────────────────┤
│  L1 — Kernel       Agent · Force · step · Vec    │
└────────────────────────────────────────────────────────┘
```

L1 is closed for modification once stable. L2 and L3 are open. L3 may depend on L2 and L1; L2 depends only on L1.

### Kernel invariants

1. The only operation on contributions is vector addition.
2. Every force has the signature `(agent, world, t, dt) => Vector`.
3. Force invocation order does not affect the final force.
4. The kernel never inspects force identity, type, or metadata.
5. Agent state is mutated only by the integrator, never by forces directly.

These invariants are the abstraction. Adding force types, priorities, or letting forces mutate state collapses the model. Extensions that need to break invariants do so in user space, not in the kernel.

### Litmus test for "where does this go"

- Produces a force? → **L2**
- Modifies the integration loop or agent state shape? → **L1**, and only with a strong reason
- Observes the system without producing forces? → **L3**
- Depends on a user data structure (renderer, scene)? → **user-land wiring**

---

## 3. Core API (L1 — Kernel)

### Vector
Minimal vector type. Mutable methods (`addInPlace`, `scaleInPlace`) for hot paths; immutable methods (`add`, `scale`) for ergonomics.

Common operations: `add`, `subtract`, `scale`, `normalize`, `magnitude`, `magnitudeSquared`, `dot`, `clone`, `set`, `setMagnitude`, `zero`.

2D-only: `perpendicular`. 3D-only: `cross`.

### Agent

```ts
class Agent {
  position: Vec
  velocity: Vec
  mass: number
  maxSpeed: number
  maxForce: number
  forces: Set<Force>

  add(c: Force): Force       // returns input as handle
  remove(c: Force): boolean
  clear(): void
}
```

### Force

```ts
type Force = (agent: Agent, world: World, t: number, dt: number) => Vec
```

Pure function. Reads `agent` (read-only by convention), `world` (free-form shared state), `t` (absolute time), `dt` (frame delta). Returns a force vector in world space.

### step

```ts
function step(agent: Agent, world: World, t: number, dt: number): void
```

One integration step. The library does not own the loop — the consumer calls `step` from `requestAnimationFrame`, a fixed tick, or wherever appropriate.

The free-function form is intentional: it makes explicit that the kernel is stateless w.r.t. agent collections. A method form `agent.update(...)` is fine cosmetically and can be added as a thin wrapper, but the canonical API is the free function.

### World
The `world` argument is passed through to every force untouched. The kernel does not read it. By convention it holds shared dynamic state (mouse, neighbor index, anything forces need). Its shape is the consumer's problem.

---

## 4. Vocabulary (L2)

### Forces - the closed set

These are the algebraic basis. Everything else in L2 is built from them.

- `attract(targetFn, falloffFn?)` — pull toward dynamic point
- `repel(sourceFn, falloffFn?)` — push from dynamic point
- `damp(coefficient)` — velocity-opposing
- `oscillate(direction, amplitude, freq, phase?)` — time-coupled
- `constant(vec)` — directional constant force
- `tangential(k)` (2D) / `tangentialAround(axis, k)` (3D) — perpendicular-to-velocity
- `align(getNeighbors, k)` — match average neighbor velocity
- `cohere(getNeighbors, k)` — toward neighbor centroid
- `separate(getNeighbors, k)` — away from close neighbors

Targets are always thunks: `() => world.mouse`, `() => leader.position.add(leader.velocity.scale(0.3))`. This collapses pursuit, offset-pursuit, and path-following into `attract` with different thunks.

### Falloff curves

Scalar functions of distance. Composable.

`falloff.constant(k)`, `falloff.linear(k)`, `falloff.invSquare(k, eps)`, `falloff.arrive(k, slowR)`, `falloff.exponential(k, rate)`, `falloff.within(fn, maxR)`, `falloff.beyond(fn, minR)`.

The `attract(target, falloffFn)` factoring is what keeps the API from exploding into `attract`/`attractInRange`/`attractWithDeadZone`/etc. Users compose curves; forces stay primitive.

### Modifiers - force-on-force operators

- `scale(c, k)` — multiply contribution
- `gate(predicate, c)` — fire only when predicate holds
- `during(start, end, c)` — time-windowed
- `fadeIn(duration, force)`, `fadeOut(duration, force)` — local-time envelope on a force's lifetime
- `sum(...forces)` — sum into one force (for handle management)

Modifiers take forces and return forces. They never reach into agent or kernel state.

### Behaviors - named conveniences

These are not forces. They're load-bearing patterns shipped as conveniences:

- `arrive(targetFn, opts)` = `attract(targetFn, falloff.arrive(...)) + damp(...)`
- `orbit(centerFn, opts)` = `attract(...) + tangential(...)`
- `flee(sourceFn, opts)` = `repel(...) + damp(...)`
- `pursue(leaderFn, opts)` = `attract` with extrapolated thunk

Documented as `attract + damp` etc. so users understand they're not privileged. A user who wants different damping curves composes forces directly.

---

## 5. Extensions (L3)

### Event system — the part worth pushing back on

There are three different things people mean by "events" in a system like this, and conflating them is the bug:

**Lifecycle events.** Useful, kernel-adjacent, low-cost. Fired by `Agent` and the step cycle.
- `step:before`, `step:after`
- `force:added`, `force:removed`
- `force:applied` *(debug-only, opt-in — emits per-step total force)*

These are mechanical and cheap to implement. Ship as a small `EventEmitter` mixin on `Agent` (~15 lines). Type-safe, no external dependency.

**Predicate events.** "Fire when `agent.velocity.magnitude() < 0.1`." User-defined condition, edge-detected by the system. *Should not be in the kernel.* Reasons:
- There's no canonical "arrived" or "stopped" — every consumer means something different.
- Edge-detection requires hysteresis, debouncing, sample windows. Each consumer wants different policy.
- Kernel awareness of predicates re-introduces ordering (when does the predicate get evaluated relative to step?).

Ship as a small extension `flyby/predicates`:
```ts
predicates.on(agent, () => agent.velocity.magnitude() < 0.1, 'rest', handler)
```
Implemented as a `step:after` listener that tracks predicate state across frames. Pure user-space.

**"Tick" events.** "Run this every frame." *Discouraged.* If the work produces a force, it belongs in the force set. If it has a side effect, it's a `step:after` handler. Inventing a separate "tick" channel duplicates the force concept and confuses readers.

Recommendation: ship lifecycle events in core. Ship predicate events as a separate small package. Document the third pattern as anti-pattern in the design notes.

### Debug / inspector

- Force visualizer — per-force arrows rendered over agents
- State recorder — ring buffer of recent positions/velocities for trajectory inspection
- Force labeling — `agent.add(arrive(...), { label: 'click-target' })`. Labels are extension metadata; kernel ignores them.

### Spatial index

`flyby/spatial`: `Grid`, `QuadTree` (2D), `Octree` (3D). Each implements `query(point, radius) => Agent[]`. Group behaviors take the index via `world.neighbors`. Kernel knows nothing about this.

---

## 6. Module Layout

```
flyby-motion/
├── src/
│   ├── 2d/
│   │   ├── kernel.ts          // Agent, step, Vec2
│   │   ├── forces.ts      // attract, repel, damp, oscillate, ...
│   │   ├── falloff.ts         // falloff.* curves
│   │   ├── behaviors.ts    // arrive, orbit, flee, pursue
│   │   ├── modifiers.ts     // scale, gate, during, fadeIn, fadeOut
│   │   └── index.ts
│   ├── 3d/
│   │   ├── kernel.ts          // Agent, step, Vec3
│   │   ├── forces.ts      // includes tangentialAround
│   │   ├── falloff.ts         // ideally re-exported from shared
│   │   ├── behaviors.ts
│   │   ├── modifiers.ts
│   │   └── index.ts
│   ├── shared/
│   │   └── falloff.ts         // dimension-agnostic curves
│   ├── extensions/
│   │   ├── events.ts
│   │   ├── predicates.ts
│   │   ├── spatial-2d.ts
│   │   ├── spatial-3d.ts
│   │   └── debug.ts
└── package.json (exports map: flyby-motion/2d, flyby-motion/3d, ...)
```

Falloff curves and modifiers are dimension-agnostic; ideally shared. If TS generics get awkward, duplicate — duplication is cheaper than wrong abstraction.

---

## 7. Build & Release Plan

**Phase 0 — Spike (1 day).** Write the kernel and four forces in a single file, no module boundaries, against one real demo (the breathing-shape-with-click case). Validate the force signature and `step` shape against actual usage. Goal is to kill bad assumptions before they're load-bearing.

**Phase 1 — Core (2D only).** Lock the kernel API. Ship full forces, falloff, modifiers, behaviors. No events, no extensions. The 2D module should stand alone.

**Phase 2 — 3D.** Port kernel and vocabulary. Reconcile dimension-agnostic forces. Decide and document `tangentialAround` semantics. No new features.

**Phase 3 — Extensions.** Lifecycle events. Debug visualizer. `flyby/predicates`.

**Phase 4 — Group behaviors.** Spatial index. `align`, `cohere`, `separate`. Flocking demo as the validation case.

Phases should not anticipate later phases. If a Phase 1 decision is forced by a Phase 3 anticipated need, that's a smell — back up and check whether you're adding scope or adding coupling.

---

## 8. Decisions to Make Before Phase 1

These are open and worth resolving explicitly because they propagate.

1. **Mutable vs immutable vectors.** Mutable is faster (no per-frame allocation), error-prone in user code. Immutable is cleaner, slower. Likely answer: mutable internally, immutable-feeling at API boundaries via cloning.
2. **`world` shape.** Free-form `any` (max flexibility, zero structure) or typed interface (`{ time, neighbors?, ... }`)? Likely answer: free-form, with a `World` helper class shipped for consumers who want structure.
3. **Force identity / labels.** Optional `c.label`, `c.id` for debug and dynamic mutation? Kernel ignores; extensions consume. Likely yes, but as opt-in metadata.
4. **dt clamping.** Caller's responsibility or kernel-clamped? Likely caller's. Document the convention; provide a helper.
5. **Removal during iteration.** Should `agent.remove(force)` inside a force be safe? Likely yes — snapshot the force set at top of `step`, defer mutations to end. Cheap, prevents the most common foot-gun.
6. **Determinism.** Same inputs → same outputs across runs (for replay, testing)? Likely yes. `Set` iteration is insertion-ordered in modern engines, and `step` is otherwise pure given inputs. Document and test.
7. **`step(agent, ...)` vs `agent.step(...)`.** Cosmetic. Free function is the canonical, method form ships as a thin wrapper if at all.

---

## 9. Test Discipline

The hard thing to test in this kind of library is *whether forces compose the way the docs claim*. Three test types matter:

- **Algebraic.** `attract + zero == attract`. `damp(a) + damp(b) == damp(a+b)` (within float tolerance). `scale(force, 0)` == zero force. Confirms that the commutative/distributive properties the design promises actually hold.
- **Trajectory.** Given setup X, after N steps the agent is within tolerance of expected position. Catches integrator bugs and vector op bugs.
- **Visual.** Demos any human can eyeball as right or wrong. For motion, this catches what unit tests can't — feel, smoothness, perceived correctness.

Algebraic and trajectory tests in CI. Visual demos in the docs site, runnable, bisectable.

---

## 10. Failure Modes to Watch For

Things that, if they start happening, mean the design is drifting:

- A primitive with more than ~10 lines of logic. Probably should be a composition of two simpler forces.
- A modifier that needs to read agent state. Modifiers operate on forces, not agents — if it needs agent state, it's a force wrapping a force, which is fine, but should be named that way.
- An extension that needs the kernel to expose new internals. The kernel should be stable. If an extension needs more, the request needs justifying against the invariants in §2.
- A "convenience" preset that users start treating as primitive. If `arrive` becomes more popular than `attract + damp`, the docs are failing — users should know they're composing, not invoking magic.
- The word "priority" appearing in a feature request. The force set is commutative. Priority is the camel's nose for ordering, types, and replace-semantics, all of which break the model.
