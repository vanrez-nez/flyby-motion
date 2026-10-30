# Modifiers

Modifiers wrap forces to change *when* or *how strongly* they apply. They take a force in and return a force out, so they compose trivially.

## What to try

- `gate` — only fires the inner force when a predicate is true (e.g. agent is within range).
- `during` — turns a force on between two timestamps.
- `fadeIn` / `fadeOut` — ramp strength over a duration.
- `sum` — combine multiple forces into one (useful for keeping a single registration).
- `custom` — write any `(agent, world, t) => vector` of your own.

## Key snippets

```ts
modifiers.gate(
  (agent) => distance(agent.position, source) < range,
  forces.repel(() => source, falloff.constant(900)),
);
```

```ts
modifiers.sum(
  baseAttract(scene),
  forces.oscillate([0, 1], 40, 0.5),
);
```
