type MagFn = (distance: number) => number;

export const mag = {
  constant: (k: number): MagFn =>
    () => k,

  linear: (k: number): MagFn =>
    (d) => k * d,

  invSquare: (k: number, eps = 0.001): MagFn =>
    (d) => k / (d * d + eps * eps),

  arrive: (k: number, slowR: number): MagFn =>
    (d) => d >= slowR ? k : k * (d / slowR),

  exponential: (k: number, falloff: number): MagFn =>
    (d) => k * Math.exp(-falloff * d),

  rangeLimit: (fn: MagFn, maxR: number): MagFn =>
    (d) => d > maxR ? 0 : fn(d),

  deadZone: (fn: MagFn, minR: number): MagFn =>
    (d) => d < minR ? 0 : fn(d),
};
