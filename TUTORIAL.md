# Getting Started

`flyby-motion` is a small library for motion-driven interactions. You build motion by adding **forces** to an **agent** and stepping the simulation each frame. There are no tweens, no keyframes, no start/end times — forces sum, integrate to velocity, integrate to position. That's the whole engine.

## Installation

```bash
npm install flyby-motion
```

```bash
pnpm add flyby-motion
yarn add flyby-motion
```

To run the demos and tutorial site locally, clone the repo and run `npm install && npm run dev`.

## Mental model

Two pieces of state per agent:

- **Position** — where the agent is. In 2D it's `[x, y]`; in 3D `[x, y, z]`. Browser-canvas convention: `+y` points down in 2D.
- **Velocity** — how position is changing per second. `[20, 0]` means moving right at 20 units/s.

Every frame, `step()` answers one question for each agent:

> What forces are pushing on this thing right now?

It sums the forces, divides by mass to get acceleration, integrates into velocity, and integrates velocity into position. That extra layer (force → velocity → position) is what gives motion its weight — things accelerate, drift, settle, overshoot.

This is also why behaviors compose without conflict. Two forces don't *fight* the way two tweens do — they **add**. An oscillator plus an arrival behavior gives you a thing that floats *while* moving toward a target.

## Quick start

```ts
import { Agent, step, forces, falloff } from 'flyby-motion';

const agent = new Agent({
  position: [0, 0],
  velocity: [0, 0],
  mass: 1,
  maxSpeed: 600,
  maxForce: 1200,
});

const target = [200, 100];
agent.add(forces.attract(() => target, falloff.constant(500)));
agent.add(forces.damp(2));

let last = performance.now();
let t = 0;

function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  t += dt;

  step(agent, {}, t, dt);

  // sprite.x = agent.position[0];
  // sprite.y = agent.position[1];

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

`t` is total elapsed time in seconds. `dt` is time since the last frame. Clamping `dt` to `1/30` keeps a tab-refocus from producing one giant simulation step.

The empty `{}` is the **world** — shared data forces can read (mouse position, neighbor lookups, etc.). Pass `{}` when you don't need it.

The library does not render. Copy `agent.position` into your scene, DOM, canvas, or whatever you draw with.

If you want to skip the manual `requestAnimationFrame` boilerplate, use `onFrame`:

```ts
import { onFrame } from 'flyby-motion';

onFrame((t, dt) => step(agent, {}, t, dt), {
  maxDelta: 1 / 30,
  autoStart: true,
  visibleOnly: true,
});
```

## How the library is organized

Four public building blocks. They all feed the same `Agent` + `step()` loop.

### Forces layer

The **forces layer** is the engine. A force is just a function that returns a vector each frame. The library ships building blocks for the common cases.

```ts
agent.add(forces.constant([0, 200]));     // gentle gravity
agent.add(forces.damp(2));                // velocity-damping
agent.add(forces.oscillate([0, 1], 30, 0.5));  // sine wave on Y
```

### Falloff layer

A **falloff function** decides how `attract` and `repel` strengths vary with distance. Without one, attract returns force = distance (rarely what you want).

```ts
forces.attract(() => target, falloff.invSquare(400));
forces.repel(() => threat, falloff.within(falloff.constant(500), 100));
```

`falloff.within` and `falloff.beyond` wrap any falloff with a range gate.

### Behaviors layer

**Behaviors** are pre-tuned bundles of forces. They are conveniences, but they stay explicit about their parameters. The fact that you can read each one as a small composition is the point of the layered design.

```ts
agent.add(behaviors.arrive(() => target));   // attract + damp, smooth deceleration
agent.add(behaviors.flee(() => threat));     // range-limited repel + damp
agent.add(behaviors.orbit(() => center));    // attract + tangential + damp
agent.add(behaviors.pursue(() => leader));   // arrive at leader's predicted future position
```

### Modifiers layer

**Modifiers** transform existing forces. They don't add new physics; they shape *when* and *how strongly* an existing force acts.

```ts
modifiers.scale(force, 0.5);                 // halve strength
modifiers.gate((agent) => isClose(agent), force);
modifiers.during(2, 5, force);               // only between t=2 and t=5
modifiers.fadeIn(0.4, force);                // ramp up over 0.4s
modifiers.sum(forceA, forceB);               // bundle multiple forces as one
```

## Writing your own force

Anything matching `(agent, world, t, dt) => number[]` is a valid force.

```ts
const wind = () => [40, 0];
agent.add(wind);

const lift = (_agent, _world, t) => (t < 2 ? [0, 0] : [0, -300]);
agent.add(lift);
```

A force should not mutate the agent. Return a vector. Let `step()` handle the rest.

If your custom force ends up looking like *"sometimes return X, sometimes return zero"*, consider whether `modifiers.gate` would express it more clearly. If it's *"ramp from zero"*, consider `modifiers.fadeIn`. The modifiers exist to keep custom forces small and readable.

## Tuning advice

Start with one force at a time. Add others once it feels right alone.

- **Motion overshoots** — increase damping, decrease strength, or increase the slow radius.
- **Motion feels sluggish** — decrease damping, increase strength, or raise `maxForce`.
- **Motion explodes** — cap `maxSpeed` and `maxForce`. Check whether two forces are fighting each other (an attract and a repel at similar strengths near the same point will get loud).
- **Agent stops moving when it shouldn't** — damping may have killed velocity. Lower damping or add a sustaining force like an oscillator or constant push.

## A learning order

If you're working through this end-to-end, this is roughly the right order to play with things:

1. `behaviors.arrive` — get a feel for "agent goes to a place."
2. `forces.damp` and `forces.constant` — the simplest low-level pieces.
3. `forces.attract` with different `falloff` curves — see how strength shaping changes feel.
4. `behaviors.flee`, `behaviors.orbit`, and `behaviors.pursue` — named patterns with full control.
5. `modifiers.gate` and `modifiers.during` — conditional and time-bounded forces.
6. Custom force functions — when nothing built in fits.

By the end, the library should feel like a small set of pieces rather than a list of features.

---

# API Reference

Every export from `flyby-motion`. Each entry shows the signature, defaults, and a short snippet.

## Agent

The simulated body. Holds position, velocity, and a set of forces.

### new Agent(options)

```ts
new Agent(options?: AgentOptions)

interface AgentOptions {
  position?: number[];   // default: [0, 0] — dimension inferred from position.length
  velocity?: number[];   // default: zero vector matching position dimension
  mass?: number;         // default: 1
  maxSpeed?: number;     // default: Infinity
  maxForce?: number;     // default: Infinity
}
```

`mass` controls how readily the agent accelerates under force. Heavier agents feel slower.

`maxSpeed` caps how fast the agent can move. `maxForce` caps the total force magnitude in any single frame — prevents violent snaps when forces combine. You can leave both at `Infinity` while prototyping.

```ts
const agent = new Agent({ position: [0, 0], maxSpeed: 600, maxForce: 1200 });
```

### agent.add / remove / clear

```ts
agent.add(force, opts?: { label?: string }): Force   // returns the force back
agent.remove(force): boolean
agent.clear(): void
```

`add` returns the same force, so you can keep a handle:

```ts
const click = agent.add(behaviors.arrive(() => target), { label: 'click' });
// later:
agent.remove(click);
```

The optional `label` is retrievable via `getForceLabel(force)` — useful for debug overlays. Forces can be added or removed mid-frame; changes take effect on the next step.

### Force type

```ts
type Force = (agent: Agent, world: World, t: number, dt: number) => number[];
```

A force returns a vector matching the agent's dimension (2 numbers in 2D, 3 in 3D). Returning `[0, 0]` means "no force this frame."

### World type

```ts
type World = Record<string, unknown>;
```

Free-form shared data passed to every force. Pass `{}` when you don't need it. Use it for mouse position, neighbor lookups, time-of-day — anything multiple forces want to read.

### getForceLabel(force)

```ts
getForceLabel(force: Force): string | undefined
```

Returns the label assigned via `agent.add(force, { label })`. Returns `undefined` if no label was set.

## step

```ts
step(agent: Agent, world: World, t: number, dt: number): void
```

Run once per frame per agent. Returns immediately if `dt <= 0`.

Order of operations: emit `step:before` → sum all forces → clamp to `maxForce` → emit `force:applied` → integrate to velocity → clamp to `maxSpeed` → integrate to position → emit `step:after`. (See **events** below to subscribe.)

```ts
step(agent, {}, t, dt);
```

## forces

Force constructors. Each returns a `Force` you pass to `agent.add()`.

### forces.constant

```ts
forces.constant(vec: number[]): Force
```

A fixed force every frame. Pair with damping to get terminal-velocity drift.

```ts
agent.add(forces.constant([0, 200]));   // gentle downward pull
agent.add(forces.damp(2));
```

### forces.damp

```ts
forces.damp(coefficient: number): Force
```

A force opposite the agent's current velocity. Reduces motion over time. Damping is what makes things settle — without it, agents tend to oscillate or drift indefinitely.

```ts
agent.add(forces.damp(2));
```

### forces.attract

```ts
forces.attract(targetFn: () => number[], falloffFn?: FalloffFn): Force
```

Pulls toward a (possibly moving) target. The target is always a function — that's how the force tracks moving targets, leader positions, predicted points. Without a falloff, magnitude equals distance, which is rarely what you want.

```ts
agent.add(forces.attract(() => target, falloff.constant(500)));
```

### forces.repel

```ts
forces.repel(sourceFn: () => number[], falloffFn?: FalloffFn): Force
```

Pushes away from a source. Same shape as `attract`, opposite direction.

```ts
agent.add(forces.repel(() => threat, falloff.invSquare(400)));
```

### forces.oscillate

```ts
forces.oscillate(direction: number[], amplitude: number, freq: number, phase?: number): Force
// phase defaults to 0
```

A sinusoidal force along an axis. Use perpendicular oscillators at different frequencies for idle floating motion.

```ts
agent.add(forces.oscillate([0, 1], 30, 0.5));   // up/down at amplitude 30, 0.5 Hz
```

### forces.drift

```ts
forces.drift(config?: DriftConfig): Force

interface DriftConfig {
  strength?: number;       // default: 50
  scale?: number;          // default: 0.5 — noise rate (lower = slower drift)
  seed?: number;           // default: per-axis index * 1000
  noiseFn?: (x: number) => number;  // default: built-in 1D Perlin
  x?: true | false | AxisConfig;
  y?: true | false | AxisConfig;
  z?: true | false | AxisConfig;
}

type AxisConfig = { strength?: number; scale?: number; seed?: number };
```

Organic idle motion. Samples smooth noise per axis. If you set any per-axis value to `true` or an `AxisConfig`, drift switches to per-axis mode and inactive axes are disabled. Use `drift` when motion should feel organic; use `oscillate` when it should feel rhythmic.

```ts
agent.add(forces.drift({ strength: 80, scale: 0.5 }));
agent.add(forces.damp(4));

// Per-axis: drift only on X with a custom seed
agent.add(forces.drift({ x: { strength: 80, seed: 42 }, y: false }));
```

### forces.tangential

```ts
forces.tangential(k: number): Force   // 2D only
```

A 2D force perpendicular to current velocity (rotated counter-clockwise). Bends paths into curves. Combined with attraction, produces orbital motion.

```ts
agent.add(forces.attract(() => center, falloff.constant(200)));
agent.add(forces.tangential(150));
```

### forces.tangentialAround

```ts
forces.tangentialAround(axis: number[], k: number): Force   // 3D
```

Same idea in 3D, but the perpendicular direction isn't unique — pass a reference axis (usually world-up).

```ts
agent.add(forces.tangentialAround([0, 1, 0], 150));
```

## falloff

Falloff functions take a distance and return a force magnitude. They're how you say "strong nearby, weak far away" or "only matters within range" without writing custom logic.

```ts
type FalloffFn = (distance: number) => number;
```

### falloff.constant

```ts
falloff.constant(k: number): FalloffFn
```

Same strength at any distance. Direction still depends on where the target is; just the *amount* is fixed.

### falloff.linear

```ts
falloff.linear(k: number): FalloffFn
```

Strength grows with distance. Spring-like. Far targets pull harder.

### falloff.invSquare

```ts
falloff.invSquare(k: number, eps?: number): FalloffFn
// eps defaults to 0.001
```

Strong nearby, fades fast with distance. Gravity- and charge-like. `eps` prevents the force exploding as distance approaches zero.

### falloff.arrive

```ts
falloff.arrive(k: number, slowR: number): FalloffFn
```

Full strength `k` outside `slowR`, scales linearly toward zero inside it. The core of smooth arrival — agents approach at full speed and ease in close.

### falloff.exponential

```ts
falloff.exponential(k: number, rate: number): FalloffFn
```

Smooth fade from `k` at zero distance toward zero at infinity. Higher `rate` = faster fade.

### falloff.within

```ts
falloff.within(fn: FalloffFn, maxR: number): FalloffFn
```

Wraps another falloff and returns zero outside `maxR`. Use for range-limited effects.

```ts
forces.repel(() => mouse, falloff.within(falloff.constant(500), 100));
```

### falloff.beyond

```ts
falloff.beyond(fn: FalloffFn, minR: number): FalloffFn
```

Wraps another falloff and returns zero *inside* `minR`. Use for dead zones — no effect when too close.

## behaviors

Pre-tuned force bundles. Each is `sum(...)` of a couple of forces, with explicit parameters.

### behaviors.arrive

```ts
behaviors.arrive(targetFn: () => number[], opts?: {
  strength?: number;   // default: 1
  slowR?: number;      // default: 100
  damp?: number;       // default: 1
}): Force
```

Pull toward a target with smooth deceleration. Equivalent to `forces.attract(targetFn, falloff.arrive(strength, slowR))` plus `forces.damp(damp)`.

```ts
// Tuned example for a fast, snappy click-to-go behavior:
agent.add(behaviors.arrive(() => target, { strength: 800, slowR: 120, damp: 2 }));
```

### behaviors.flee

```ts
behaviors.flee(sourceFn: () => number[], opts?: {
  strength?: number;   // default: 1
  range?: number;      // default: 200
  damp?: number;       // default: 0.5
}): Force
```

Push away while the source is inside `range`; outside that distance, damping lets the agent settle.

```ts
agent.add(behaviors.flee(() => threat, { strength: 700, range: 200, damp: 1.5 }));
```

### behaviors.orbit

```ts
behaviors.orbit(centerFn: () => number[], opts?: {
  attractK?: number;   // default: 1
  tangentK?: number;   // default: 1
  damp?: number;       // default: 0
}): Force
```

`attract + tangential + damp`. There is no radius parameter — orbit shape emerges from the balance of forces. This bundle is 2D-only because `tangential` is 2D; for 3D, compose `attract + tangentialAround` manually.

### behaviors.pursue

```ts
behaviors.pursue(
  leaderFn: () => { position: number[]; velocity: number[] },
  opts?: {
    strength?: number;   // default: 5
    slowR?: number;      // default: 50
    damp?: number;       // default: 1
    lookahead?: number;  // default: 0.3 (seconds)
  },
): Force
```

Like `arrive`, but targets the leader's *predicted* future position based on its velocity.

```ts
agent.add(behaviors.pursue(() => ({ position: leader.pos, velocity: leader.vel }), {
  strength: 600,
  lookahead: 0.3,
}));
```

## modifiers

Operations on existing forces.

### modifiers.scale

```ts
modifiers.scale(force: Force, k: number): Force
```

Multiply a force's strength by `k`. Use `0.5` to soften, `2` to amplify, `-1` to invert.

### modifiers.gate

```ts
modifiers.gate(
  pred: (agent: Agent, world: World, t: number) => boolean,
  force: Force,
): Force
```

Run a force only when a condition holds. When `pred` is false, the modifier returns the zero vector.

```ts
const closeRepel = modifiers.gate(
  (agent) => distanceTo(agent.position, target) < 100,
  forces.repel(() => target, falloff.constant(800)),
);
```

### modifiers.during

```ts
modifiers.during(start: number, end: number, force: Force): Force
```

Run a force only during a time window. Times are seconds since `t = 0`.

```ts
agent.add(modifiers.during(2, 5, forces.constant([100, 0])));
```

### modifiers.fadeIn

```ts
modifiers.fadeIn(duration: number, force: Force): Force
```

Ramp a force from zero to full strength over `duration` seconds, starting from the first frame the modifier is evaluated. Useful when a sudden force-on would feel like a snap.

### modifiers.fadeOut

```ts
modifiers.fadeOut(duration: number, force: Force): Force
```

Symmetrical to `fadeIn` — ramps from full to zero over `duration`. After that, the modifier always returns zero.

### modifiers.sum

```ts
modifiers.sum(...forces: Force[]): Force
```

Add multiple forces into a single force. The agent does this internally already; `sum` exposes the same operation so you can pre-bundle forces and manage them as a unit.

```ts
const combo = modifiers.sum(
  behaviors.arrive(() => target, { strength: 800, slowR: 120, damp: 2 }),
  forces.oscillate([0, 1], 20, 0.5),
);

agent.add(combo);   // remove `combo` and both parts go at once
```

## Utilities

Smaller helpers — the bits you reach for occasionally.

### onFrame

A `requestAnimationFrame` wrapper that hands you `(elapsed, delta)` in seconds.

```ts
onFrame(callback: (elapsed: number, delta: number) => void, options?: FrameOptions): FrameUpdater

interface FrameOptions {
  maxDelta?: number;     // default: Infinity — clamp per-frame delta in seconds
  autoStart?: boolean;   // default: false — start the loop immediately
  visibleOnly?: boolean; // default: false — skip callback while document is hidden
}

interface FrameUpdater {
  start(): FrameUpdater;
  stop(): FrameUpdater;
  getElapsedTime(): number;
  getDelta(): number;
}
```

```ts
const updater = onFrame((t, dt) => step(agent, {}, t, dt), { maxDelta: 1 / 30 }).start();
// later:
updater.stop();
```

### events

Agent extends an `EventEmitter`. Subscribe with `agent.on(name, handler)`; unsubscribe by calling the returned function or `agent.off(name, handler)`.

| Event           | Payload                          |
|-----------------|----------------------------------|
| `step:before`   | `(agent, world, t, dt)`          |
| `step:after`    | `(agent, world, t, dt)`          |
| `force:applied` | `(totalForce: number[])` — clamped sum |
| `force:added`   | `(force)`                        |
| `force:removed` | `(force)`                        |

```ts
const off = agent.on('force:applied', (total) => debugDraw(total));
// later: off();
```

### spatial

Shared interface for neighbor lookups. Useful when forces need to query nearby agents without checking everyone.

```ts
interface SpatialIndex<T> {
  insert(point: number[], data: T): void;
  remove(point: number[], data: T): boolean;
  query(point: number[], radius: number): T[];
  clear(): void;
}
```

Implementations:

- `new Grid<T>(cellSize: number)` — uniform grid; great default for evenly distributed agents.
- `new QuadTree<T>(bounds: { x, y, w, h }, capacity?: number = 8)` — 2D, adaptive subdivision.
- `new Octree<T>(bounds: { x, y, z, w, h, d }, capacity?: number = 8)` — 3D, adaptive subdivision.

```ts
import { spatial } from 'flyby-motion';

const grid = new spatial.Grid<Agent>(50);
agents.forEach((a) => grid.insert(a.position, a));
const nearby = grid.query(agent.position, 100);
```

### Vector2 and Vector3

Small mutable vector classes. Constructors accept defaults that chain (`new Vector2(5)` gives `(5, 5)`, `new Vector3(5)` gives `(5, 5, 5)`).

Methods on both: `set`, `copy`, `clone`, `add`, `sub`, `multiply`, `divide`, `scale`, `negate`, `inverse`, `normalize`, `dot`, `len`, `squaredLen`, `distance`, `squaredDistance`, `lerp`, `smoothLerp`, `equals`, `fromArray`, `toArray`. `Vector3` adds `angle`. `Vector2.cross` returns a scalar; `Vector3.cross` writes a vector and is mutating — pick the right one for your code path.

These are convenient for app code. The library itself works on `number[]` and uses the function-style helpers below.

### Vector2Fn and Vector3Fn

Out-style pure functions following the gl-matrix convention `(out, a, b) => out`. They mutate `out` and return it, so you can chain or alias.

```ts
import { Vector2Fn } from 'flyby-motion';

const out = [0, 0];
Vector2Fn.subtract(out, target, agent.position);
Vector2Fn.normalize(out, out);
Vector2Fn.scale(out, out, 100);
```

Functions in both: `copy`, `set`, `add`, `subtract`, `multiply`, `divide`, `scale`, `negate`, `inverse`, `normalize`, `dot`, `cross`, `length`, `squaredLength`, `distance`, `squaredDistance`, `lerp`, `smoothLerp`, `exactEquals`. `Vector3Fn` also exports `angle`. `Vector2Fn.cross` returns a scalar (the z-component of the 3D cross). `Vector3Fn.cross` writes into `out`.
