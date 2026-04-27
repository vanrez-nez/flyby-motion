# flyby-motion API Reference

`flyby-motion` is a small motion/steering library built around `Agent` objects, force contributors, and a fixed integration step. Vectors are plain `number[]` arrays, so the same contributor model works for 2D and 3D as long as position, velocity, and returned force vectors use the same dimension.

This document is a reference for the public API exported from `src/index.ts`.

## Core Types

```ts
type World = Record<string, unknown>;
type Contributor = (agent: Agent, world: World, t: number, dt: number) => number[];
```

A `Contributor` returns a force vector for the current frame. `step(...)` sums all contributors, clamps total force by `agent.maxForce`, applies acceleration from `force / mass`, clamps speed by `agent.maxSpeed`, then integrates position.

## Agent

```ts
new Agent(opts?: {
  position?: number[];
  velocity?: number[];
  mass?: number;
  maxSpeed?: number;
  maxForce?: number;
})
```

Creates a moving particle-like object.

- `position`: Initial position vector. Its length determines whether the agent is 2D, 3D, etc. Defaults to `[0, 0]`.
- `velocity`: Initial velocity vector. Defaults to a zero vector with the same dimension as `position`.
- `mass`: Divides applied force when updating velocity. Higher mass makes the same force accelerate the agent more slowly. Defaults to `1`.
- `maxSpeed`: Maximum velocity magnitude after integration. Use this to cap runaway motion. Defaults to `Infinity`.
- `maxForce`: Maximum summed force magnitude per step. Use this to cap abrupt steering changes. Defaults to `Infinity`.

### `agent.add(contributor, opts?)`

```ts
agent.add(c: Contributor, opts?: { label?: string }): Contributor
```

Adds a force contributor to the agent.

- `c`: Function that returns a force vector every step.
- `label`: Optional debug label stored for the contributor.

Returns the same contributor so callers can keep a handle for removal.

### `agent.remove(contributor)`

```ts
agent.remove(c: Contributor): boolean
```

Removes a contributor by identity. Returns `true` if it was present.

### `agent.clear()`

Removes every contributor from the agent.

### `getContributorLabel(contributor)`

```ts
getContributorLabel(c: Contributor): string | undefined
```

Returns the optional label assigned through `agent.add(...)`.

## Simulation

### `step(agent, world, t, dt)`

```ts
step(agent: Agent, world: World, t: number, dt: number): void
```

Advances an agent by one frame.

- `agent`: The agent to update.
- `world`: Shared external state passed to contributors. The core library does not inspect it.
- `t`: Current simulation time. Contributors like `oscillate(...)`, `during(...)`, `fadeIn(...)`, and `fadeOut(...)` use this.
- `dt`: Frame delta in seconds. If `dt <= 0`, no update happens.

Order of operations:

1. Emit `step:before`.
2. Snapshot current contributors.
3. Sum contributor forces.
4. Clamp total force to `agent.maxForce`.
5. Emit `force:applied`.
6. Add acceleration to velocity using `force * dt / mass`.
7. Clamp velocity to `agent.maxSpeed`.
8. Add `velocity * dt` to position.
9. Emit `step:after`.

## Primitive Contributors

Import as:

```ts
import { primitives } from 'flyby-motion';
```

### `primitives.constant(vec)`

```ts
constant(vec: number[]): Contributor
```

Always returns a copy of `vec`.

- `vec`: Constant force vector. Larger components produce constant acceleration in those axes.

### `primitives.damp(coefficient)`

```ts
damp(coefficient: number): Contributor
```

Returns a force opposite the agent's velocity: `velocity * -coefficient`.

- `coefficient`: Drag strength. Higher values remove velocity faster. `0` means no damping.

Damping does not pull toward any target. It only slows current motion.

### `primitives.oscillate(direction, amplitude, freq, phase?)`

```ts
oscillate(direction: number[], amplitude: number, freq: number, phase = 0): Contributor
```

Applies a sinusoidal force along `direction`.

- `direction`: Force axis. Its length scales the output unless you pass a normalized vector.
- `amplitude`: Maximum scalar applied to `direction`.
- `freq`: Oscillation frequency in cycles per second.
- `phase`: Phase offset in radians.

The force is `direction * amplitude * sin(2 * PI * freq * t + phase)`.

### `primitives.attract(targetFn, magFn?)`

```ts
attract(targetFn: () => number[], magFn?: (distance: number) => number): Contributor
```

Applies force from the agent toward a target.

- `targetFn`: Called every step. Return the current target position.
- `magFn`: Converts distance to force magnitude. If omitted, magnitude equals distance.

Direction comes from `target - agent.position`. If the agent is effectively at the target, the force is zero.

### `primitives.repel(sourceFn, magFn?)`

```ts
repel(sourceFn: () => number[], magFn?: (distance: number) => number): Contributor
```

Applies force away from a source.

- `sourceFn`: Called every step. Return the current source position.
- `magFn`: Converts distance to force magnitude. If omitted, magnitude equals distance.

Direction comes from `agent.position - source`. If the agent is effectively at the source, the force is zero.

### `primitives.tangential(k)`

```ts
tangential(k: number): Contributor
```

2D-only force perpendicular to the current velocity.

- `k`: Tangential force magnitude.

For velocity `[vx, vy]`, the returned force points counter-clockwise: `[-vy / speed * k, vx / speed * k]`. If speed is zero, the force is `[0, 0]`.

This is perpendicular to velocity, not perpendicular to a center/radius vector.

### `primitives.tangentialAround(axis, k)`

```ts
tangentialAround(axis: number[], k: number): Contributor
```

3D force perpendicular to velocity in the plane defined by `velocity x axis`.

- `axis`: Reference axis used to compute the perpendicular direction.
- `k`: Force magnitude.

If velocity and axis cannot produce a perpendicular vector, the force is zero.

## Magnitude Functions

Import as:

```ts
import { mag } from 'flyby-motion';
```

Magnitude functions convert distance into scalar force strength. They are commonly passed to `attract(...)` or `repel(...)`.

### `mag.constant(k)`

```ts
constant(k: number): (distance: number) => number
```

Always returns `k`. Distance changes direction but not force size.

### `mag.linear(k)`

```ts
linear(k: number): (distance: number) => number
```

Returns `k * distance`. Farther targets produce stronger force.

### `mag.invSquare(k, eps?)`

```ts
invSquare(k: number, eps = 0.001): (distance: number) => number
```

Returns `k / (distance * distance + eps * eps)`.

- `k`: Overall strength.
- `eps`: Softening term that prevents extreme values near zero distance.

Useful for gravity-like or charge-like falloff.

### `mag.arrive(k, slowR)`

```ts
arrive(k: number, slowR: number): (distance: number) => number
```

Returns `k` outside the slow radius, and scales down inside it.

- `k`: Maximum force magnitude.
- `slowR`: Distance where slowdown begins. Larger values make the agent start easing earlier.

Inside `slowR`, magnitude is `k * (distance / slowR)`.

### `mag.exponential(k, falloff)`

```ts
exponential(k: number, falloff: number): (distance: number) => number
```

Returns `k * exp(-falloff * distance)`.

- `k`: Maximum strength near zero distance.
- `falloff`: Decay rate. Higher values make force fade faster with distance.

### `mag.rangeLimit(fn, maxR)`

```ts
rangeLimit(fn: MagFn, maxR: number): MagFn
```

Wraps another magnitude function and returns zero beyond `maxR`.

- `fn`: Magnitude function to apply inside range.
- `maxR`: Maximum active distance.

### `mag.deadZone(fn, minR)`

```ts
deadZone(fn: MagFn, minR: number): MagFn
```

Wraps another magnitude function and returns zero inside `minR`.

- `fn`: Magnitude function to apply outside the dead zone.
- `minR`: Minimum active distance.

## Compositions

Import as:

```ts
import { compositions } from 'flyby-motion';
```

Compositions are predefined combinations of primitives and combinators.

### `compositions.arrive(targetFn, opts?)`

```ts
arrive(
  targetFn: () => number[],
  opts?: { k?: number; slowR?: number; damp?: number }
): Contributor
```

Attracts toward a target and slows near it.

- `targetFn`: Returns the target position each step.
- `k`: Maximum attraction force. Higher values steer harder toward the target. Defaults to `1`.
- `slowR`: Slow radius. Larger values begin easing farther from the target. Defaults to `100`.
- `damp`: Velocity damping. Higher values reduce overshoot but can make motion sluggish. Defaults to `1`.

Equivalent to `attract(targetFn, mag.arrive(k, slowR)) + damp(damp)`.

### `compositions.flee(sourceFn, opts?)`

```ts
flee(
  sourceFn: () => number[],
  opts?: { k?: number; damp?: number }
): Contributor
```

Repels from a source and damps velocity.

- `sourceFn`: Returns the source position each step.
- `k`: Repulsion force magnitude. Higher values push away harder. Defaults to `1`.
- `damp`: Velocity damping. Higher values make the agent settle after escaping. Defaults to `0.5`.

Equivalent to `repel(sourceFn, mag.constant(k)) + damp(damp)`.

### `compositions.orbit(centerFn, opts?)`

```ts
orbit(
  centerFn: () => number[],
  opts?: { attractK?: number; tangentK?: number; damp?: number }
): Contributor
```

Combines attraction toward a center with tangential force and damping.

- `centerFn`: Returns the orbit center each step.
- `attractK`: Constant inward attraction. Higher values pull harder toward center. Defaults to `1`.
- `tangentK`: Force perpendicular to current velocity. Higher values curve the path more strongly. Defaults to `1`.
- `damp`: Velocity damping. Higher values bleed off energy and can collapse the orbit. Defaults to `0`.

The API does not take an orbit radius. Radius emerges from force balance, velocity, mass, damping, `maxSpeed`, and `maxForce`.

### `compositions.pursue(leaderFn, opts?)`

```ts
pursue(
  leaderFn: () => { position: number[]; velocity: number[] },
  opts?: { k?: number; slowR?: number; damp?: number; lookahead?: number }
): Contributor
```

Steers toward the leader's predicted future position.

- `leaderFn`: Returns the leader's current `position` and `velocity`.
- `k`: Maximum arrival force toward the predicted point. Defaults to `5`.
- `slowR`: Arrival slow radius around the predicted point. Defaults to `50`.
- `damp`: Velocity damping. Defaults to `1`.
- `lookahead`: Prediction time multiplier. Higher values target farther ahead of the leader. Defaults to `0.3`.

The predicted target is `leader.position + leader.velocity * lookahead`.

## Combinators

Import as:

```ts
import { combinators } from 'flyby-motion';
```

Combinators transform, gate, or combine contributors.

### `combinators.scale(contributor, k)`

```ts
scale(c: Contributor, k: number): Contributor
```

Multiplies another contributor's force by `k`.

- `c`: Source contributor.
- `k`: Scalar multiplier. Values above `1` strengthen the force; values between `0` and `1` soften it; negative values invert it.

### `combinators.gate(predicate, contributor)`

```ts
gate(
  pred: (agent: Agent, world: World, t: number) => boolean,
  c: Contributor
): Contributor
```

Runs a contributor only when `predicate` returns true.

- `pred`: Gate condition.
- `c`: Contributor to allow or suppress.

When closed, returns a zero vector matching the agent dimension.

### `combinators.during(start, end, contributor)`

```ts
during(start: number, end: number, c: Contributor): Contributor
```

Runs a contributor only during a time interval.

- `start`: First active simulation time.
- `end`: Last active simulation time.
- `c`: Contributor to run during the interval.

Outside `[start, end]`, returns zero.

### `combinators.fadeIn(duration, contributor)`

```ts
fadeIn(duration: number, c: Contributor): Contributor
```

Scales a contributor from zero to full strength after it is first evaluated.

- `duration`: Fade duration in seconds. `0` or less means full strength immediately.
- `c`: Contributor to fade in.

### `combinators.fadeOut(duration, contributor)`

```ts
fadeOut(duration: number, c: Contributor): Contributor
```

Scales a contributor from full strength down to zero after it is first evaluated.

- `duration`: Fade duration in seconds. `0` or less means zero strength immediately.
- `c`: Contributor to fade out.

### `combinators.combined(...contributors)`

```ts
combined(...cs: Contributor[]): Contributor
```

Sums multiple contributors into a single contributor.

- `cs`: Contributors to evaluate and add together.

## Events

Import as:

```ts
import { events } from 'flyby-motion';
```

`events` exports `EventEmitter` and `EventHandler`.

Agents emit these events:

- `step:before`: `(agent, world, t, dt)` before contributors run.
- `force:applied`: `(totalForce)` after force summing and max-force clamping.
- `step:after`: `(agent, world, t, dt)` after position is updated.
- `contributor:added`: `(contributor)` when `add(...)` is called.
- `contributor:removed`: `(contributor)` when `remove(...)` or `clear()` removes one.

### `EventEmitter.on(event, handler)`

Registers a handler and returns an unsubscribe function.

### `EventEmitter.off(event, handler)`

Removes a previously registered handler.

### `EventEmitter.emit(event, ...args)`

Calls registered handlers for the event.

## Spatial Indexes

Import as:

```ts
import { spatial } from 'flyby-motion';
```

Spatial indexes implement:

```ts
interface SpatialIndex<T = unknown> {
  insert(point: number[], data: T): void;
  remove(point: number[], data: T): boolean;
  query(point: number[], radius: number): T[];
  clear(): void;
}
```

- `point`: Position used for indexing.
- `data`: Stored payload returned from queries.
- `radius`: Query distance from the provided point.

### `new spatial.Grid(cellSize)`

Uniform grid spatial index for any vector dimension.

- `cellSize`: Size of each grid cell. Smaller cells reduce per-cell scanning but increase cell bookkeeping. Larger cells are cheaper to maintain but queries may inspect more entries.

### `new spatial.QuadTree(bounds, capacity?)`

2D quadtree.

```ts
new QuadTree<T>({ x, y, w, h }, capacity = 8)
```

- `bounds`: Inclusive/exclusive rectangular world bounds. Points outside are ignored on insert.
- `capacity`: Number of points a node can hold before subdividing. Higher capacity creates fewer nodes but more scanning per leaf.

### `new spatial.Octree(bounds, capacity?)`

3D octree.

```ts
new Octree<T>({ x, y, z, w, h, d }, capacity = 8)
```

- `bounds`: Inclusive/exclusive 3D bounds. Points outside are ignored on insert.
- `capacity`: Number of points a node can hold before subdividing.

## Dimension Rules

Most core functions dispatch between 2D and 3D based on vector length. Contributors should return vectors with the same dimension as `agent.position`.

Supported internal vector dimensions are 2 and 3. Passing other dimensions into core contributor math may throw `RangeError: Unsupported vector dimension`.
