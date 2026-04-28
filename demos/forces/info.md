# Forces

A force is a function `(agent, world, t) => vector`. The library composes them per agent and the integrator does the rest. Each mode in this demo isolates a single primitive so you can feel it on its own.

## What to try

- Switch modes from the **mode** dropdown.
- Drag the yellow target (attract) or pink source (repel) marker on the canvas.
- For `drift` and `oscillate`, toggle the per-axis booleans to see what each axis contributes.
- Press <kbd>R</kbd> to reset positions.

## Key snippets

A point attractor with a falloff curve:

```ts
forces.attract(
  () => [scene.target.x, scene.target.y],
  falloff.arrive(900, 220),
);
```

`damp` is just velocity-proportional drag, useful as a stabilizer:

```ts
forces.damp(2);
```

Stack idle motion onto a structured force:

```ts
forces.drift({
  strength: 220,
  scale: 0.45,
  x: { seed: seedX },
  y: { seed: seedY },
});
```
