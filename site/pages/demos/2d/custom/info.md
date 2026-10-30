# Custom

Three small recipes that show how forces, modifiers, and per-agent state combine into expressive motion.

## What to try

- **Idle disturbance** — agents idle around a home point with subtle drift, then flee from your cursor when it gets close.
- **Target capture** — agents hold near the center, but break formation to chase the cursor when it enters the center radius.
- **Keep distance** — agents settle on a ring around your cursor with adjustable stiffness.

Move the cursor in/out of the marked radii to feel the gating thresholds.

## Key snippets

A gated repel that only fires inside a radius:

```ts
modifiers.gate(
  (agent) =>
    scene.mouse.active &&
    distance(agent.position, mouse) < radius,
  forces.repel(() => mouse, falloff.constant(strength)),
);
```

Per-agent state via `WeakMap` (no library hook needed):

```ts
const homeByAgent = new WeakMap<Agent, [number, number]>();

configureAgent(entry) {
  homeByAgent.set(entry.agent, [...entry.agent.position]);
}

buildForces(entry) {
  const home = homeByAgent.get(entry.agent)!;
  return [forces.attract(() => home, (d) => d * 1.6)];
}
```
