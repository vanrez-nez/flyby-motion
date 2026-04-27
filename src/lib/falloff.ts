export type FalloffFn = (distance: number) => number;

export const falloff = {
  constant: (k: number): FalloffFn =>
    () => k,

  linear: (k: number): FalloffFn =>
    (d) => k * d,

  invSquare: (k: number, eps = 0.001): FalloffFn =>
    (d) => k / (d * d + eps * eps),

  arrive: (k: number, slowR: number): FalloffFn =>
    (d) => d >= slowR ? k : k * (d / slowR),

  exponential: (k: number, rate: number): FalloffFn =>
    (d) => k * Math.exp(-rate * d),

  within: (fn: FalloffFn, maxR: number): FalloffFn =>
    (d) => d > maxR ? 0 : fn(d),

  beyond: (fn: FalloffFn, minR: number): FalloffFn =>
    (d) => d < minR ? 0 : fn(d),
};
