# 3D Forces

The same force primitives as the 2D demo, applied to agents living in 3D. Vectors automatically dispatch on `agent.position.length`, so a force you write once works in either dimensionality.

## What to try

- Switch modes from the **mode** dropdown.
- **Right-click and drag** the yellow target or pink source marker to move it through the scene (it stays on the camera-facing plane).
- For `drift` and `tangentialAround`, toggle the per-axis options to see how the noise / rotation maps onto each axis.
- Press <kbd>R</kbd> to reset; orbit the scene with the left mouse button.

## Key snippets

3D attract uses the same call shape as 2D — only the vectors are 3D:

```ts
forces.attract(
  () => [target.x, target.y, target.z],
  falloff.arrive(8, 2.4),
);
```

`tangentialAround` is the 3D analog of 2D `tangential`: rotate around an axis instead of a point.

```ts
forces.tangentialAround([0, 1, 0], 4); // spin around world Y
```
