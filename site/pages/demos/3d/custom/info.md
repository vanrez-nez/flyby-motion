# 3D Custom

Hand-rolled compositions in 3D. Each mode pairs a structural force (return-to-center, capture, keep-distance) with one or more conditional reactions.

## What to try

- **Idle disturbance** — agents idle near the white center origin with drift / oscillate noise; right-click drag the pink source to disturb them inside its radius.
- **Target capture** — agents hold near the center; if you drag the yellow target inside the center radius, they break out to capture it inside the smaller target radius.
- **Keep distance** — drag the source; agents settle on a sphere around it whose stiffness you can tune.

## Key snippet

Composing return-to-home + reactive repel + ambient idle in one `sum`:

```ts
modifiers.sum(
  idleForce, // drift or oscillate
  forces.attract(context.points.center, (d) => d * homeStrength),
  modifiers.gate(
    (agent) =>
      distance3(agent.position, source) < sourceRadius,
    forces.repel(() => source, falloff.constant(sourceStrength)),
  ),
  forces.damp(damp),
);
```
