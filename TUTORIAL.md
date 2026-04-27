# flyby-motion Tutorial

This tutorial walks through `flyby-motion` from the simplest possible use to the underlying force model. You can stop after the first section and still build useful things. Read further when you need more control.

## How the library is organized

There are two layers, and you choose which one you want.

The **presets layer** is for casual use. One line of code, sensible defaults, no terminology to learn. Pick a preset that names what you want — follow, snap, float, flee — and use it.

The **forces layer** is the real engine underneath. Every preset is built from it. When a preset doesn't quite do what you need, drop down here. You'll find a small set of building blocks that compose into anything the presets do, and a lot they don't.

Both layers use the same `Agent` and `step(...)` loop. The presets are not a parallel system. They're shortcuts.

## The mental model

Every frame, the library answers one question for each agent:

> What forces are pushing on this thing right now?

It sums those forces, turns them into acceleration, then into velocity, then into position. That's the whole engine. There are no tweens, no keyframes, no start/end times. Forces just exist, and the agent moves under them.

This is why behaviors compose without conflict. Two forces don't "fight" the way two tweens do — they add. An idle floating force plus a follow-the-cursor force gives you a thing that floats *while* following.

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

## Layer 1: Presets

The fast path. One line, defaults handled for you.

```ts
import { presets } from 'flyby-motion';

agent.add(presets.follow(() => cursor));
```

That's a working follower. The agent eases toward the cursor and settles when it arrives, without overshoot. Tweak by passing options; ignore them if defaults work.

### `presets.follow(targetFn, opts?)`

Smooth follow, settles on arrival. Best default for cursor following, draggable handles, "move to here" UI.

```ts
agent.add(presets.follow(() => cursor, {
  strength: 800,   // how hard to pull
  ease: 120,       // distance over which it slows down
}));
```

### `presets.snapTo(targetFn, opts?)`

Sharper than `follow`. Arrives faster, less easing. Use for snappy, responsive feel.

```ts
agent.add(presets.snapTo(() => target, { strength: 1500 }));
```

### `presets.flee(sourceFn, opts?)`

Pushes away from a source, then comes to rest. Self-stopping.

```ts
agent.add(presets.flee(() => threat, {
  strength: 700,
  range: 200,    // only flees when source is within this distance
}));
```

### `presets.float(opts?)`

Idle floating motion — gentle drift on two axes. Compose this with anything else.

```ts
agent.add(presets.float({ amplitude: 20, freq: 0.4 }));
```

### `presets.orbit(centerFn, opts?)`

Circles a point at approximately the requested radius.

```ts
agent.add(presets.orbit(() => center, { radius: 100 }));
```

The radius is approximate because orbit shape emerges from force balance, not from a constraint. Strong perturbations from other forces will deform it.

### `presets.repelFrom(sourceFn, opts?)`

Personal-space behavior. Pushes away when the source gets close, ignores it otherwise.

```ts
agent.add(presets.repelFrom(() => mouse, { range: 100, strength: 500 }));
```

### `presets.drift(opts?)`

Constant directional motion with terminal velocity.

```ts
agent.add(presets.drift({ direction: [1, 0], speed: 50 }));
```

### Combining presets

Presets stack. Add as many as you want.

```ts
agent.add(presets.float({ amplitude: 15 }));
agent.add(presets.follow(() => cursor));
agent.add(presets.repelFrom(() => obstacle, { range: 80 }));
```

The agent will float idly, follow the cursor, and dodge around the obstacle — all at once, without you writing any glue. This is the point of forces composing: there's no "current animation" to interrupt, just a list of things pushing on the agent.

When presets stop being enough, drop to the next layer.

---

## Layer 2: Forces

Underneath every preset there's a force. A **force** is just a function that returns a vector each frame:

```ts
type Force = (agent, world, t, dt) => number[];
```

You add forces to an agent. The library sums them. That's it.

The library ships four kinds of things at this layer:

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

#### `forces.oscillate(direction, amplitude, freq, phase?)`

A sinusoidal force along an axis.

```ts
agent.add(forces.oscillate([0, 1], 30, 0.5));
```

Pushes up and down with amplitude 30, twice per second. Two perpendicular oscillators at different frequencies are how `presets.float` is built.

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

### `behaviors`

```ts
import { behaviors } from 'flyby-motion';
```

Behaviors are tuned bundles of forces. They're what most presets are made of, exposed at the forces layer so you can configure them more precisely than presets allow.

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

Push away with damping. Self-stopping.

#### `behaviors.orbit(centerFn, opts?)`

Attract + tangential + damping. Note: there is no radius parameter. Orbit shape emerges from the balance of forces. If you want a specific radius, use `presets.orbit` which tunes the parameters for you.

#### `behaviors.pursue(leaderFn, opts?)`

Like `arrive`, but targets the leader's predicted future position based on its velocity.

```ts
agent.add(behaviors.pursue(() => ({ position: leader.pos, velocity: leader.vel }), {
  strength: 600,
  lookahead: 0.3,
}));
```

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
const click = agent.add(presets.snapTo(() => target));

// later:
agent.remove(click);
```

`agent.clear()` removes all forces.

Forces can be added and removed mid-frame. Changes take effect on the next step.

---

## When to use which layer

A rough heuristic:

- **Presets** if you want a named behavior with a sensible default. Cursor follow, snap, flee, float, orbit at a radius.
- **Behaviors** if you want a named pattern with full parameter control. Same patterns as presets, but you choose every knob.
- **Forces + falloff + modifiers** if you're composing something custom. Combining flee with idle drift, gating an attractor by distance, time-windowing an effect.
- **Custom force functions** if your motion depends on state the library doesn't model — game logic, animation phase, external sensors.

You can mix layers freely. A custom force coexists with presets coexists with behaviors. Everything ends up in the same sum.

## Tuning advice

Start with one force at a time. Add others once it feels right alone.

If motion overshoots: increase damping, decrease strength, or increase the slow radius.

If motion feels sluggish: decrease damping, increase strength, or raise `maxForce`.

If motion explodes: cap `maxSpeed` and `maxForce`. Check whether two forces are fighting each other (an attract and a repel at similar strengths near the same point will get loud).

If an agent stops moving when it shouldn't: damping may have killed its velocity. Either lower damping or add a sustaining force (oscillator, drift, or a constant push).

## A learning order

If you're working through this end to end, this is roughly the right order to play with things:

1. `presets.follow` and `presets.snapTo` — get a feel for "agent goes to a place."
2. `presets.float` on top of either — see how forces combine.
3. `forces.damp` and `forces.constant` — the simplest pieces of the next layer.
4. `forces.attract` with different `falloff` curves — understand how strength shaping changes feel.
5. `behaviors.arrive` and `behaviors.orbit` — named patterns with full control.
6. `modifiers.gate` and `modifiers.during` — conditional and time-bounded forces.
7. Custom force functions — when nothing built in fits.

By the time you reach step 7, the library should feel like a small set of pieces rather than a list of features.