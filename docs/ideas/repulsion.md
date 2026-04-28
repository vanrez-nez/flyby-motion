# Inter-Agent Repulsion — Feature Spec

A force-based approach to "agents stay apart" without introducing a constraint subsystem. Agents repel from each other via standard force composition, producing clustering, packing, and personal-space behaviors as emergent properties of the existing kernel.

---

## 1. Motivation

The library needs a way to express "agents avoid overlapping" or "agents maintain spacing." Two approaches were considered:

**Hard constraints** — a post-integration relaxation pass (PBD-style position projection) that enforces minimum distances exactly. Robust, but introduces a new architectural concept (constraints, solver iterations, velocity back-correction) and breaks the "everything is a force" invariant the library has been built around.

**Soft repulsion** — each agent carries a repel force that pushes away from every other agent. Stays inside the existing force model. Distances are *soft*: agents may briefly compress under stress before springing apart. No new architecture.

This spec covers the soft repulsion approach. Hard constraints remain a separate, deferred feature. The decision rule between the two:

- **Use soft repulsion** when "agents stay roughly apart" is sufficient. Covers personal-space behavior, clustering around attractors, loose packing, animation feel.
- **Use hard constraints** (when implemented) when "agents must never overlap" is a correctness requirement. Covers physics-y simulation, exact spacing, chains and rigid links.

For the foreseeable demo and use cases (cluster-around-cursor, dispersed agents avoiding the mouse, simple flocking-adjacent behavior), soft repulsion is sufficient.

---

## 2. Concept

Per agent, two forces in combination:

1. **An attractor** — pulls the agent toward a shared target (cursor, leader, point of interest).
2. **A repulsor** — pushes the agent away from every *other* agent, ignoring itself.

The cluster forms because attraction concentrates agents at one point and repulsion prevents them from occupying the same space. Equilibrium is a packed arrangement around the attractor. Adding damping prevents oscillation; adding range-limiting on the repulsor prevents quadratic work from dominating at scale.

This composes with everything else in the library. An idle `presets.float` makes the cluster jiggle. A `forces.attract` toward the cursor makes the cluster follow. `modifiers.gate` can disable repulsion conditionally. None of these need to know about each other — they all enter the same force sum.

---

## 3. What this gives, and what it doesn't

### Gives

- **Composition with existing forces.** No new mental model. Anyone who learned `forces.repel` already understands the mechanism; the only new idea is "the source can be a list."
- **Graceful degradation.** Under perturbation, the cluster deforms instead of exploding. Agents may briefly compress, then re-expand. No solver to fail.
- **No special integration scheme.** Works with the current semi-implicit Euler integrator unchanged.

### Doesn't give

- **Hard distance guarantees.** Two agents flung directly at each other at high speed will pass through one another for a frame or two before repulsion overcomes momentum. Invisible for most UI/animation work; visible when overlap is a story problem.
- **Exact spacing.** Distances at equilibrium depend on the balance of attraction, repulsion, falloff curve, mass, and `maxForce`. Not directly tunable to "exactly 50px apart."
- **Stable behavior at extreme stiffness.** If repulsion strength is cranked very high to *approximate* a hard constraint, the system will start to oscillate — the classic stiff-spring failure. If you find yourself reaching for very high stiffness, that's the signal to use hard constraints instead.

These limits are not bugs. They're the cost of staying inside the force model. If they bite, the answer is the constraint subsystem, not stiffer repulsion.

---

## 4. API

### 4.1 The flat encoding (no new primitive)

For small groups (up to ~30 agents), no library change is needed. The behavior is expressible with existing primitives:

```js
agents.forEach(self => {
  agents.forEach(other => {
    if (other !== self) {
      self.add(forces.repel(
        () => other.position,
        falloff.within(falloff.invSquare(2000), 80),
      ));
    }
  });
});
```

Each agent gets `N-1` individual `forces.repel` contributors, one per peer. Per-pair forces accumulate naturally in the kernel sum.

This is the recommended encoding for teaching demos and small-N use cases — the mechanism is visible in the code. A reader sees "N-1 repels per agent, summed" and the abstraction stays transparent.

### 4.2 The grouped encoding (new primitive)

For larger groups, a single primitive collapses the inner loop:

```js
forces.repelFromGroup(getGroup, falloffFn, opts?)
```

**Parameters:**
- `getGroup: () => Agent[]` — thunk returning the array of agents. Mutating the array changes membership.
- `falloffFn: (distance) => number` — standard falloff function shaping force strength.
- `opts.exclude?: (other, self) => boolean` — defaults to identity comparison (`other === self`).

**Implementation sketch (~12 lines):**

```js
forces.repelFromGroup = (getGroup, falloffFn, opts = {}) => (agent) => {
  const exclude = opts.exclude || ((other, self) => other === self);
  const total = Vec.zero(agent.position.length);
  const group = getGroup();
  for (const other of group) {
    if (exclude(other, agent)) continue;
    const offset = Vec.subtract(agent.position, other.position);
    const dist = Vec.magnitude(offset);
    if (dist < 1e-6) continue;
    const strength = falloffFn(dist);
    if (strength === 0) continue;
    Vec.addInPlace(total, Vec.scale(Vec.normalize(offset), strength));
  }
  return total;
};
```

**Usage:**

```js
agents.forEach(agent => {
  agent.add(forces.repelFromGroup(
    () => agents,
    falloff.within(falloff.invSquare(2000), 80),
  ));
});
```

Same behavior as the flat encoding. Reduced contributor count, fewer per-frame allocations, and crucially: prunable when paired with a spatial index (deferred — see §7).

### 4.3 Self-exclusion

Three approaches were considered:

1. **By identity** (`other === self`). Default. Cleanest, requires no additional state.
2. **By ID/label.** Useful if agents can be cloned or deduplicated by something other than reference. Overkill for current needs.
3. **By caller passing self explicitly.** Most explicit, but awkward at the API boundary.

Identity comparison is the default. The `opts.exclude` hook covers the rare cases where it's not enough.

---

## 5. Cost analysis

The total work is `N × (N-1)` pairwise checks per frame, regardless of encoding. What differs is per-contributor overhead.

| Agents (N) | Flat contributors | Grouped contributors | Pairwise checks/frame |
|---|---|---|---|
| 5 | 20 | 5 | 20 |
| 10 | 90 | 10 | 90 |
| 30 | 870 | 30 | 870 |
| 100 | 9,900 | 100 | 9,900 |
| 500 | 249,500 | 500 | 249,500 |

The flat encoding is `N × (N-1)` *contributors* — each evaluated as a separate force function call by the kernel, each returning a fresh vector. The grouped encoding is `N` contributors, each internally doing `N-1` checks.

**Practical thresholds:**

- **Up to ~30 agents:** flat encoding. Overhead is invisible, code is clearer.
- **30–100 agents:** grouped primitive. Allocation pressure becomes the dominant cost in the flat version.
- **100+ agents:** grouped + spatial index. Without pruning, O(N²) work becomes the simulation bottleneck.

The threshold isn't sharp — it depends on what other forces are running, browser, hardware. The numbers above are heuristic, not measured.

---

## 6. Falloff selection

The repulsion's falloff curve determines its feel. Worth choosing deliberately:

- **`falloff.invSquare(k)`** — strong close-range repulsion, long tail. Good for "personal space." Requires range-limiting at scale or the long tail dominates the sum.
- **`falloff.exponential(k, rate)`** — smooth fade, no long tail. Easier to tune than inverse-square.
- **`falloff.arrive(k, slowR)`** — full strength inside `slowR`, scales down outside. Sharp transition; good for "personal space with a defined edge."
- **`falloff.within(falloff.invSquare(k), maxR)`** — inverse-square hard-clipped past `maxR`. The recommended default for clustering demos: aggressive close-range, exactly zero past `maxR` (which makes spatial pruning possible later).

The default for new users should be range-limited inverse-square. It's easy to reason about ("strong nearby, exactly zero past R") and pre-configures for the spatial-index optimization without requiring it.

---

## 7. Deferred: spatial pruning

Range-limiting the falloff makes pruning *possible* but doesn't perform it. Each pair is still checked, even when the answer is zero. The grouped primitive is the right place to add pruning later:

```js
// Future API, not part of this feature
forces.repelFromGroup(
  () => world.spatialIndex.query(agent.position, 80),  // only nearby
  falloff.within(falloff.invSquare(2000), 80),
);
```

When a `world.spatialIndex` is available (out of scope for this feature), the group thunk returns only candidates within range. Work scales as O(N × k) where k is the average neighbor count, not O(N²).

This is the path to thousands of agents. Out of scope for the current feature. Mentioned here so the API doesn't paint itself into a corner — the `getGroup` thunk is intentionally generic enough to accept either "all agents" or "agents near me."

---

## 8. Demo

### 8.1 Cluster around cursor

The canonical demo. ~12 agents, attracted to the mouse, repelling each other.

```js
const agents = Array.from({ length: 12 }, () => new Agent({
  position: [Math.random() * 800, Math.random() * 600],
  maxSpeed: 400,
  maxForce: 800,
}));

const world = { cursor: [400, 300] };
canvas.addEventListener('mousemove', e => {
  world.cursor = [e.offsetX, e.offsetY];
});

agents.forEach(agent => {
  agent.add(forces.attract(() => world.cursor, falloff.arrive(300, 100)));
  agent.add(forces.repelFromGroup(
    () => agents,
    falloff.within(falloff.invSquare(2000), 80),
  ));
  agent.add(forces.damp(2));
});
```

The expected behavior: agents flow toward the cursor and pack into a roughly circular cluster around it. Moving the cursor drags the cluster, which deforms briefly and re-equilibrates.

### 8.2 Failure-mode exploration

The demo should expose the tuning, not just the working state. A panel of sliders for:

- **Repulsion strength** — too low: overlap. Too high: oscillation.
- **Repulsion range** — too low: clipping artifacts. Too high: diffuse cluster, slower.
- **Damping** — too low: jitter. Too high: sluggish response.
- **Attraction strength** — too low: agents drift apart. Too high: compression overwhelms repulsion.

A working tuning at the defaults, with sliders that let the reader break it deliberately, teaches more than a polished single-state demo. It also pre-empts the "I tried this and it exploded" issue.

### 8.3 Optional variations

Worth including if space permits:

- **Multiple attractors.** Agents distribute across two cursors / clickpoints.
- **Asymmetric exclusion.** Some agents are repelled by others but not vice versa.
- **Float on top.** Add `presets.float` to each agent — cluster jiggles while following.

---

## 9. Anti-patterns and pitfalls

### Cranking repulsion to fake a hard constraint

If overlap matters enough that you're tuning repulsion to be very stiff, you've left the regime where this approach works well. Stiff springs in a discrete-time integrator oscillate or explode. Use hard constraints (deferred) instead.

### Forgetting damping

A pure attract+repel system without damping will oscillate indefinitely — agents bounce around the equilibrium without losing energy. Damping is not optional for stable clustering. The demo defaults include it deliberately.

### Mutating the agent list mid-frame

The `getGroup` thunk is called every frame. Mutating the array between contributor evaluations within a single frame can produce inconsistent forces (some agents see the new list, some see the old). Mutate the array between frames, or at minimum between full step passes over all agents.

### Treating this as flocking

This is **separation only** — one of the three Reynolds boids behaviors. Real flocking adds **alignment** (match neighbors' velocity) and **cohesion** (move toward neighbors' centroid). The shared-attractor approach gives something cohesion-*like*, but it's not the same — true cohesion has no shared attractor, the cluster forms purely from pairwise interactions. If the next demo is "boids," this is a third of the way there. If it's just "agents clustering around a target," this is the whole feature.

---

## 10. Open questions

- **Does the grouped primitive belong in `forces` or in a new `groupForces` namespace?** Argument for `forces`: it's still a force, and namespace proliferation is its own cost. Argument against: it has fundamentally different work characteristics than the per-pair primitives. Lean toward keeping it in `forces` until a second group-aware primitive arrives.
- **Should `presets` ship a clustering preset?** `presets.cluster(getGroup, attractorFn)` would bundle attract + repel-from-group + damp with sensible defaults. Useful for the "I just want clustering" case. Probably yes, as a follow-up once the underlying force is stable.
- **Mass-weighted repulsion?** Currently the force is symmetric — both agents are pushed equally. In a heterogeneous-mass scenario, heavier agents should move less. Trivial to add (`scale by 1/mass` on the receiving side, which already happens during integration). Mentioned because it's the kind of thing that gets retrofit awkwardly if not considered up front.
- **Does this need a "minimum distance" parameter as a UX shortcut?** Users will reach for `repelFromGroup({ minDistance: 50 })` and expect it to "just work." Internally that maps to a falloff that's strong inside 50 and zero outside, which is `falloff.within(falloff.constant(strong), 50)` — but the abstraction "minimum distance" matches user intent better than "falloff curve." Worth considering as a convenience layer on top, the way `presets` sits on top of `forces`.