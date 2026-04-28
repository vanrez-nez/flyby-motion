# 3D Modifiers

Modifiers compose the same way in 3D as in 2D — they wrap a force and decide *when* or *how strongly* it fires. The shape of the wrapped force is unchanged.

## What to try

- `gate` — flips on inside the source radius; watch the agents only feel the repel near the marker.
- `during` / `fadeIn` / `fadeOut` — note the timeline-based behavior; press <kbd>R</kbd> to replay.
- `custom` — a hand-written force showing how to add a perpendicular wobble to a basic attract.

## Key snippet

```ts
modifiers.fadeIn(
  3, // seconds
  forces.attract(() => target, falloff.arrive(8, 2.8)),
);
```
