# flyby-motion Tutorial

This tutorial walks through `flyby-motion` from the simplest useful behavior to custom force functions.

## How the library is organized

There are four public building blocks, and they all feed the same `Agent` + `step(...)` loop.

The **forces layer** is the engine. A force returns a vector each frame.

The **falloff layer** shapes forces that depend on distance.

The **behaviors layer** bundles common force combinations like arrival, fleeing, orbiting, and pursuit.

The **modifiers layer** transforms forces: scale them, gate them, time-window them, or sum them.

## The mental model

Every frame, the library answers one question for each agent:

> What forces are pushing on this thing right now?

It sums those forces, turns them into acceleration, then into velocity, then into position. That's the whole engine. There are no tweens, no keyframes, no start/end times. Forces just exist, and the agent moves under them.

This is why behaviors compose without conflict. Two forces don't "fight" the way two tweens do — they add. An oscillating force plus an arrival behavior gives you a thing that floats *while* moving toward a target.

## Position and velocity

Two pieces of state per agent.

**Position** is where the agent is. In 2D it's `[x, y]`. `[100, 50]` means 100 right, 50 down (using browser canvas conventions where y increases downward).

**Velocity** is how position is changing. `[20, 0]` means moving right at 20 units per second. `[0, -20]` means moving up at 20.

Forces don't change position directly. They change velocity, and velocity changes position. That extra layer is what gives motion its weight — things accelerate, drift, settle, overshoot.

## Creating an agent

```ts
import { Agent } from 'flyby-motion';

const agent = new Agent({
  position: [0, 0],
  velocity: [0, 0],
  mass: 1,
  maxSpeed: 600,
  maxForce: 1200,
});
```

`mass` controls how readily the agent accelerates under force. Heavier agents feel slower. Start at `1`.

`maxSpeed` caps how fast the agent can move. Useful when forces would otherwise accelerate it past anything reasonable.

`maxForce` caps the total force in any single frame. Prevents violent snaps when forces combine or targets jump.

You can leave the caps at `Infinity` while prototyping and add them when motion gets unruly.

## The frame loop

Call `step(...)` once per frame.

```ts
import { step } from 'flyby-motion';

let t = 0;
let last = performance.now();

function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  t += dt;

  step(agent, {}, t, dt);

  // Render however you want:
  // sprite.x = agent.position[0];
  // sprite.y = agent.position[1];

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

`t` is total elapsed time in seconds. `dt` is the time since the last frame. The library uses both. Clamping `dt` to `1/30` prevents huge jumps when a tab regains focus.

The empty `{}` is the **world** — shared data for forces that need it (mouse position, neighbor lookups, etc.). Pass `{}` when you don't need it.

The library does not render. Copy `agent.position` into your scene, DOM, canvas, or whatever you draw with.

---

## Layer 1: Forces

A **force** is just a function that returns a vector each frame:

```ts
type Force = (agent, world, t, dt) => number[];
```

You add forces to an agent. The library sums them. That's it.

The library ships four force-building namespaces:

- **`forces`** — the building blocks (attract, repel, damp, oscillate, …)
- **`falloff`** — curves that shape how force strength varies with distance
- **`behaviors`** — pre-tuned bundles of forces (arrive, flee, orbit, pursue)
- **`modifiers`** — operations on forces (scale, gate, time-window, sum)

If you can name a behavior in those four buckets, you usually don't need to write a custom force. If you can't, you write a function that returns a vector and add it directly.

### `forces`

```ts
import { forces } from 'flyby-motion';
```

#### `forces.attract(targetFn, falloffFn?)`

Pulls toward a (possibly moving) target.

```ts
agent.add(forces.attract(() => target, falloff.constant(500)));
```

The target is always a function — that's how the force tracks moving targets, leader positions, predicted points, anything dynamic.

The falloff function decides force *strength* based on distance. Without one, strength equals distance (farther → stronger), which is rarely what you want.

#### `forces.repel(sourceFn, falloffFn?)`

The opposite. Pushes away.

```ts
agent.add(forces.repel(() => threat, falloff.invSquare(400)));
```

#### `forces.damp(coefficient)`

A force opposite the agent's current velocity. Reduces motion over time.

```ts
agent.add(forces.damp(2));
```

Damping is what makes things settle. Without it, agents tend to oscillate or drift indefinitely.

#### `forces.drift(config?)`

Organic idle motion. `drift` samples smooth noise and turns it into a force, so the agent keeps moving in an unpredictable but gentle way.

```ts
agent.add(forces.drift({ strength: 80 }));
agent.add(forces.damp(4));
```

The canonical idle pattern adds a weak home spring. Drift creates the living motion, damping keeps velocity under control, and the spring keeps the equilibrium centered on the home position.

```ts
const home = [...agent.position];

agent.add(forces.drift({ strength: 80, scale: 0.5 }));
agent.add(forces.attract(() => home, (distance) => distance * 2));
agent.add(forces.damp(4));
```

Use `drift` when the motion should feel organic and unpredictable. Use `oscillate` when it should feel structured or rhythmic. Drift composes cleanly with home springs because its noise has no long-term directional bias; oscillators are better for deliberate pulses, breathing, or regular waves.

#### `forces.oscillate(direction, amplitude, freq, phase?)`

A sinusoidal force along an axis.

```ts
agent.add(forces.oscillate([0, 1], 30, 0.5));
```

Pushes up and down with amplitude 30, twice per second. Combine two perpendicular oscillators at different frequencies for idle floating motion.

#### `forces.constant(vec)`

A fixed force every frame. Pair with damping to get terminal-velocity drift.

```ts
agent.add(forces.constant([0, 200]));   // gentle gravity
agent.add(forces.damp(2));
```

#### `forces.tangential(k)` (2D) / `forces.tangentialAround(axis, k)` (3D)

A force perpendicular to current velocity. Bends paths into curves. Combined with attraction, it produces orbital motion.

```ts
agent.add(forces.attract(() => center, falloff.constant(200)));
agent.add(forces.tangential(150));
```

In 3D the perpendicular direction isn't unique — pass a reference axis (usually world-up):

```ts
agent.add(forces.tangentialAround([0, 1, 0], 150));
```

## Layer 2: Falloff

Falloff functions shape attraction and repulsion by distance.

### `falloff`

```ts
import { falloff } from 'flyby-motion';
```

Falloff functions take a distance and return a force magnitude. They're how you say "strong nearby, weak far away" or "only matters within range" without writing custom logic.

#### `falloff.constant(k)`

Same strength at any distance. Direction still depends on where the target is; just the *amount* is fixed.

#### `falloff.linear(k)`

Strength grows with distance. Spring-like. Far targets pull harder.

#### `falloff.invSquare(k, eps?)`

Strong nearby, fades fast with distance. Gravity-like, charge-like. The `eps` parameter prevents the force exploding when distance approaches zero.

#### `falloff.arrive(k, slowR)`

Full strength outside `slowR`, scales down inside it. The core of smooth arrival — agents approach at full speed and ease in close.

#### `falloff.exponential(k, rate)`

Smooth fade from `k` at zero distance toward zero at infinity. Higher `rate` = faster fade.

#### `falloff.within(fn, maxR)`

Wraps another falloff and returns zero outside `maxR`. Use for range-limited effects.

```ts
forces.repel(() => mouse, falloff.within(falloff.constant(500), 100));
```

#### `falloff.beyond(fn, minR)`

Wraps another falloff and returns zero *inside* `minR`. Use for dead zones — no effect when too close.

## Layer 3: Behaviors

Behaviors are named force combinations with explicit parameters.

### `behaviors`

```ts
import { behaviors } from 'flyby-motion';
```

Behaviors are tuned bundles of forces. They are conveniences, but they stay explicit about their real parameters.

#### `behaviors.arrive(targetFn, opts?)`

Pull toward a target with smooth deceleration.

```ts
agent.add(behaviors.arrive(() => target, {
  strength: 800,
  slowR: 120,
  damp: 2,
}));
```

Equivalent to `forces.attract(targetFn, falloff.arrive(strength, slowR))` plus `forces.damp(damp)` summed together. The fact that you can read it as "attract + damp" is the point of the layered design.

#### `behaviors.flee(sourceFn, opts?)`

Push away while the source is inside `range`; outside that distance, damping lets the agent settle.

```ts
agent.add(behaviors.flee(() => threat, {
  strength: 700,
  range: 200,
  damp: 1.5,
}));
```

#### `behaviors.orbit(centerFn, opts?)`

Attract + tangential + damping. There is no radius parameter. Orbit shape emerges from the balance of forces.

#### `behaviors.pursue(leaderFn, opts?)`

Like `arrive`, but targets the leader's predicted future position based on its velocity.

```ts
agent.add(behaviors.pursue(() => ({ position: leader.pos, velocity: leader.vel }), {
  strength: 600,
  lookahead: 0.3,
}));
```

## Layer 4: Modifiers

Modifiers transform existing forces.

### `modifiers`

```ts
import { modifiers } from 'flyby-motion';
```

Modifiers take a force and return a new force. They don't add new physics; they shape *when* and *how strongly* an existing force acts.

#### `modifiers.scale(force, k)`

Multiply a force's strength by `k`. Use `0.5` to soften, `2` to amplify, `-1` to invert.

#### `modifiers.gate(predicate, force)`

Run a force only when a condition holds.

```ts
const closeRepel = modifiers.gate(
  (agent) => distanceTo(agent.position, target) < 100,
  forces.repel(() => target, falloff.constant(800)),
);
```

#### `modifiers.during(start, end, force)`

Run a force only during a time window. Times are in seconds since `t=0`.

```ts
agent.add(modifiers.during(2, 5, forces.constant([100, 0])));
```

#### `modifiers.fadeIn(duration, force)` / `modifiers.fadeOut(duration, force)`

Ramp a force in or out smoothly over a duration. Useful when a sudden force-on or force-off would feel like a snap.

#### `modifiers.sum(...forces)`

Add multiple forces into a single force. This is exactly what the agent does internally — `sum` exposes the same operation so you can pre-bundle forces and manage them as a unit.

```ts
const combo = modifiers.sum(
  behaviors.arrive(() => target, { strength: 800, slowR: 120, damp: 2 }),
  forces.oscillate([0, 1], 20, 0.5),
);

agent.add(combo);
```

The agent treats `combo` as one force. Removing `combo` removes both of its parts at once.

---

## Writing your own force

Anything that takes `(agent, world, t, dt)` and returns a vector is a valid force.

```ts
const wind = () => [40, 0];
agent.add(wind);
```

A force that activates after two seconds:

```ts
const lift = (_agent, _world, t) => {
  if (t < 2) return [0, 0];
  return [0, -300];
};
agent.add(lift);
```

A force should not mutate the agent. Return a vector. Let `step(...)` handle the rest.

If your custom force ends up looking like "sometimes return X, sometimes return Y," consider whether `modifiers.gate` would express it more clearly. If it's "ramp from zero," consider `modifiers.fadeIn`. The modifiers exist to keep custom forces small and readable.

## Adding and removing forces

`agent.add(force)` returns the same force back, so you can keep a handle:

```ts
const click = agent.add(behaviors.arrive(() => target));

// later:
agent.remove(click);
```

`agent.clear()` removes all forces.

Forces can be added and removed mid-frame. Changes take effect on the next step.

---

## When to use which layer

A rough heuristic:

- **Behaviors** if you want a named pattern with full parameter control.
- **Forces + falloff + modifiers** if you're composing something custom. Combining flee with idle float, gating an attractor by distance, time-windowing an effect.
- **Custom force functions** if your motion depends on state the library doesn't model — game logic, animation phase, external sensors.

You can mix layers freely. A custom force coexists with behaviors and modifiers. Everything ends up in the same sum.

## Tuning advice

Start with one force at a time. Add others once it feels right alone.

If motion overshoots: increase damping, decrease strength, or increase the slow radius.

If motion feels sluggish: decrease damping, increase strength, or raise `maxForce`.

If motion explodes: cap `maxSpeed` and `maxForce`. Check whether two forces are fighting each other (an attract and a repel at similar strengths near the same point will get loud).

If an agent stops moving when it shouldn't: damping may have killed its velocity. Either lower damping or add a sustaining force like an oscillator or a constant push.

## A learning order

If you're working through this end to end, this is roughly the right order to play with things:

1. `behaviors.arrive` — get a feel for "agent goes to a place."
2. `forces.damp` and `forces.constant` — the simplest low-level pieces.
3. `forces.attract` with different `falloff` curves — understand how strength shaping changes feel.
4. `behaviors.flee`, `behaviors.orbit`, and `behaviors.pursue` — named patterns with full control.
5. `modifiers.gate` and `modifiers.during` — conditional and time-bounded forces.
6. Custom force functions — when nothing built in fits.

By the time you reach step 7, the library should feel like a small set of pieces rather than a list of features.
