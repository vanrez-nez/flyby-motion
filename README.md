# flyby-motion

`flyby-motion` is a small force-based motion library. It updates `Agent` objects by summing forces, applying acceleration, updating velocity, and then updating position. Rendering is left to your app.

## Getting Started

```ts
import {
  Agent,
  behaviors,
  step,
} from 'flyby-motion';

const agent = new Agent({
  position: [0, 0],
  velocity: [0, 0],
  mass: 1,
  maxSpeed: 600,
  maxForce: 1200,
});

const target = [300, 200];
agent.add(behaviors.arrive(() => target, {
  strength: 800,
  slowR: 120,
  damp: 2,
}));

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

## Core API

```ts
type World = Record<string, unknown>;
type Force = (agent: Agent, world: World, t: number, dt: number) => number[];
```

### `new Agent(opts?)`

```ts
new Agent({
  position?: number[];
  velocity?: number[];
  mass?: number;
  maxSpeed?: number;
  maxForce?: number;
})
```

- `position`: Current position vector. Its length determines 2D vs 3D. Defaults to `[0, 0]`.
- `velocity`: Current velocity vector. Defaults to a zero vector matching `position`.
- `mass`: Divides applied force when changing velocity. Higher mass accelerates slower. Defaults to `1`.
- `maxSpeed`: Maximum velocity magnitude. Defaults to `Infinity`.
- `maxForce`: Maximum summed force magnitude per step. Defaults to `Infinity`.

### `agent.add(force, opts?)`

Adds a force and returns the same force as a removal handle.

- `force`: Function returning a force vector every step.
- `label`: Optional debug label in `opts`.

### `agent.remove(force)`

Removes a force by identity. Returns `true` if it was present.

### `agent.clear()`

Removes all forces.

### `getForceLabel(force)`

Returns the optional label assigned through `agent.add(...)`.

### `step(agent, world, t, dt)`

Advances one agent by one frame.

- `agent`: Agent to update.
- `world`: Shared state passed to forces. The library does not inspect it.
- `t`: Current simulation time in seconds.
- `dt`: Frame delta in seconds. If `dt <= 0`, no update happens.

Order: emit `step:before`, snapshot forces, sum forces, clamp by `maxForce`, emit `force:applied`, update velocity, clamp by `maxSpeed`, update position, emit `step:after`.

## Forces

Import as:

```ts
import { forces } from 'flyby-motion';
```

Forces are the low-level building blocks. They return vectors that `step(...)` sums.

- `forces.constant(vec)`: Always returns a copy of `vec`.
- `forces.damp(coefficient)`: Pushes opposite velocity. Higher coefficient removes velocity faster.
- `forces.oscillate(direction, amplitude, freq, phase?)`: Sinusoidal force along an axis.
- `forces.attract(targetFn, falloffFn?)`: Pushes toward a target.
- `forces.repel(sourceFn, falloffFn?)`: Pushes away from a source.
- `forces.tangential(k)`: 2D force perpendicular to current velocity.
- `forces.tangentialAround(axis, k)`: 3D perpendicular force using `velocity x axis`.

For `attract` and `repel`, the position function is called every step. The optional falloff function converts distance to force magnitude.

## Falloff

Import as:

```ts
import { falloff } from 'flyby-motion';
```

Falloff functions take distance and return force magnitude.

- `falloff.constant(k)`: Same strength at every distance.
- `falloff.linear(k)`: Strength is `k * distance`.
- `falloff.invSquare(k, eps?)`: Strong nearby, fades quickly with distance.
- `falloff.arrive(k, slowR)`: Full strength outside `slowR`, scales down inside.
- `falloff.exponential(k, rate)`: Smooth exponential decay.
- `falloff.within(fn, maxR)`: Returns zero beyond `maxR`.
- `falloff.beyond(fn, minR)`: Returns zero inside `minR`.

## Behaviors

Import as:

```ts
import { behaviors } from 'flyby-motion';
```

Behaviors are configurable bundles of forces.

### `behaviors.arrive(targetFn, opts?)`

Equivalent to attraction with arrival falloff plus damping.

- `strength`: Maximum attraction force. Defaults to `1`.
- `slowR`: Slow radius. Defaults to `100`.
- `damp`: Velocity damping. Defaults to `1`.

### `behaviors.flee(sourceFn, opts?)`

Equivalent to range-limited repel plus damping.

- `strength`: Repulsion strength. Defaults to `1`.
- `range`: Active threat distance. Defaults to `200`.
- `damp`: Velocity damping. Defaults to `0.5`.

### `behaviors.orbit(centerFn, opts?)`

Attraction plus tangential force plus damping. This behavior does not accept a radius; orbit shape emerges from force balance.

- `attractK`: Constant inward attraction. Defaults to `1`.
- `tangentK`: Perpendicular-to-velocity force. Defaults to `1`.
- `damp`: Velocity damping. Defaults to `0`.

### `behaviors.pursue(leaderFn, opts?)`

Arrives at a predicted future leader position.

- `leaderFn`: Returns `{ position, velocity }`.
- `strength`: Maximum arrival force. Defaults to `5`.
- `slowR`: Slow radius around the predicted point. Defaults to `50`.
- `damp`: Velocity damping. Defaults to `1`.
- `lookahead`: Prediction multiplier. Defaults to `0.3`.

Prediction is `leader.position + leader.velocity * lookahead`.

## Modifiers

Import as:

```ts
import { modifiers } from 'flyby-motion';
```

Modifiers transform or combine forces.

- `modifiers.scale(force, k)`: Multiplies a force by `k`.
- `modifiers.gate(predicate, force)`: Runs a force only when the predicate returns true.
- `modifiers.during(start, end, force)`: Runs a force only inside a time window.
- `modifiers.fadeIn(duration, force)`: Ramps force from zero to full strength.
- `modifiers.fadeOut(duration, force)`: Ramps force from full strength to zero.
- `modifiers.sum(...forces)`: Adds multiple forces into one force.

## Events

Agents emit:

- `step:before`: before forces run.
- `force:applied`: after force summing and max-force clamping.
- `step:after`: after position is updated.
- `force:added`: when `agent.add(...)` is called.
- `force:removed`: when `agent.remove(...)` or `agent.clear()` removes a force.

## Spatial Indexes

Import as:

```ts
import { spatial } from 'flyby-motion';
```

Spatial indexes provide `insert(point, data)`, `remove(point, data)`, `query(point, radius)`, and `clear()`.

- `new spatial.Grid(cellSize)`: Uniform grid for any vector dimension.
- `new spatial.QuadTree({ x, y, w, h }, capacity?)`: 2D quadtree.
- `new spatial.Octree({ x, y, z, w, h, d }, capacity?)`: 3D octree.

## Dimension Rules

Most force math supports 2D and 3D vectors. Forces should return vectors with the same dimension as `agent.position`. Unsupported dimensions may throw `RangeError`.
