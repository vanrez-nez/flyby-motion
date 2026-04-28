# Behaviors

Behaviors are pre-composed forces tuned for a familiar feel: arriving, fleeing, pursuing, orbiting. Each one is just a `Force` under the hood, so you can mix them with anything else.

## What to try

- Drag the marker around — note how `arrive` slows down inside the slow-radius while `flee` only triggers within `range`.
- For `pursue`, raise **lookahead** to see the agents anticipate the leader's path.
- For `orbit`, change **tangentK** vs **attractK** to switch between tight orbit and inward spiral.

## Key snippets

```ts
behaviors.arrive(() => [target.x, target.y], {
  strength: 1800,
  slowR: 220,
  damp: 4,
});
```

```ts
behaviors.pursue(() => leader, {
  strength: 1600,
  lookahead: 0.45,
});
```
