# 3D Behaviors

Pre-composed behaviors (`arrive`, `flee`, `pursue`, `orbit`) running in 3D. The 2D and 3D builds share the same code path — pass 3-vectors and you get 3D motion.

## What to try

- Right-click drag the yellow target or pink source.
- For `pursue`, raise **lookahead** to see anticipation; the leader follows a parametric curve.
- For `orbit`, change the `axisX/Y/Z` sliders to tilt the orbit plane.

## Key snippets

```ts
behaviors.arrive(() => [target.x, target.y, target.z], {
  strength: 9,
  slowR: 3.2,
  damp: 1.6,
});
```

Orbit = attract + tangential around an axis:

```ts
modifiers.sum(
  forces.attract(() => source, () => attractK),
  forces.tangentialAround([0, 1, 0], tangentK),
  forces.damp(0.25),
);
```
