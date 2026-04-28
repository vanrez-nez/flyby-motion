import { describe, it, expect } from 'vitest';
import { Agent } from '../Agent';
import { step } from '../step';
import { attract, repel, damp, oscillate, drift, constant, tangential, tangentialAround } from '../forces';

// Helpers
const agent2d = (pos = [0, 0], vel = [0, 0]) =>
  new Agent({ position: pos, velocity: vel });

const agent3d = (pos = [0, 0, 0], vel = [0, 0, 0]) =>
  new Agent({ position: pos, velocity: vel });

const dot2 = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1];
const dot3 = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len2 = (a: number[]) => Math.sqrt(a[0] ** 2 + a[1] ** 2);

describe('attract', () => {
  it('pulls toward target — direction is target - position', () => {
    const a = agent2d([0, 0]);
    const target = [10, 0];
    const c = attract(() => target);
    const force = c(a, {}, 0, 0.016);
    expect(force[0]).toBeGreaterThan(0);
    expect(force[1]).toBeCloseTo(0, 10);
  });

  it('returns zero when agent is at target', () => {
    const a = agent2d([5, 5]);
    const force = attract(() => [5, 5])(a, {}, 0, 0.016);
    expect(force).toEqual([0, 0]);
  });

  it('returns zero when agent is within the distance epsilon', () => {
    const a = agent2d([0, 0]);
    const force = attract(() => [0.0005, 0], () => 10)(a, {}, 0, 0.016);
    expect(force).toEqual([0, 0]);
  });

  it('applies force when agent is outside the distance epsilon', () => {
    const a = agent2d([0, 0]);
    const force = attract(() => [0.002, 0], () => 10)(a, {}, 0, 0.016);
    expect(force[0]).toBeCloseTo(10, 5);
    expect(force[1]).toBeCloseTo(0, 10);
  });

  it('applies custom falloff function', () => {
    const a = agent2d([0, 0]);
    const force = attract(() => [3, 4], () => 10)(a, {}, 0, 0);
    // direction unit = [3/5, 4/5], magnitude = 10
    expect(force[0]).toBeCloseTo(6, 5);
    expect(force[1]).toBeCloseTo(8, 5);
  });

  it('returns a new array each call (no mutation)', () => {
    const a = agent2d([0, 0]);
    const c = attract(() => [1, 0]);
    const f1 = c(a, {}, 0, 0);
    const f2 = c(a, {}, 0, 0);
    expect(f1).not.toBe(f2);
  });
});

describe('repel', () => {
  it('pushes away from source — direction is position - source', () => {
    const a = agent2d([5, 0]);
    const force = repel(() => [0, 0])(a, {}, 0, 0.016);
    expect(force[0]).toBeGreaterThan(0);
    expect(force[1]).toBeCloseTo(0, 10);
  });

  it('returns zero when agent is at source', () => {
    const a = agent2d([3, 3]);
    const force = repel(() => [3, 3])(a, {}, 0, 0);
    expect(force).toEqual([0, 0]);
  });

  it('returns zero when agent is within the distance epsilon', () => {
    const a = agent2d([0.0005, 0]);
    const force = repel(() => [0, 0], () => 10)(a, {}, 0, 0.016);
    expect(force).toEqual([0, 0]);
  });

  it('applies force when agent is outside the distance epsilon', () => {
    const a = agent2d([0.002, 0]);
    const force = repel(() => [0, 0], () => 10)(a, {}, 0, 0.016);
    expect(force[0]).toBeCloseTo(10, 5);
    expect(force[1]).toBeCloseTo(0, 10);
  });

  it('applies custom falloff function', () => {
    const a = agent2d([3, 4]);
    const force = repel(() => [0, 0], () => 10)(a, {}, 0, 0);
    // direction unit = [3/5, 4/5], magnitude = 10
    expect(force[0]).toBeCloseTo(6, 5);
    expect(force[1]).toBeCloseTo(8, 5);
  });

  it('returns a new array each call (no mutation)', () => {
    const a = agent2d([1, 0]);
    const c = repel(() => [0, 0]);
    expect(c(a, {}, 0, 0)).not.toBe(c(a, {}, 0, 0));
  });
});

describe('damp', () => {
  it('force is -velocity * coefficient', () => {
    const a = agent2d([0, 0], [4, -2]);
    const force = damp(0.9)(a, {}, 0, 0.016);
    expect(force[0]).toBeCloseTo(-3.6, 10);
    expect(force[1]).toBeCloseTo(1.8, 10);
  });

  it('zero force for zero velocity', () => {
    const a = agent2d([0, 0], [0, 0]);
    const force = damp(0.9)(a, {}, 0, 0.016);
    expect(force[0]).toBeCloseTo(0, 10);
    expect(force[1]).toBeCloseTo(0, 10);
  });

  it('returns a new array (no mutation)', () => {
    const a = agent2d([0, 0], [1, 0]);
    const c = damp(1);
    expect(c(a, {}, 0, 0)).not.toBe(a.velocity);
  });
});

describe('oscillate', () => {
  it('produces sinusoidal force in specified direction', () => {
    const a = agent2d();
    const c = oscillate([1, 0], 10, 2);
    // at t=0: sin(0)=0
    expect(c(a, {}, 0, 0)[0]).toBeCloseTo(0, 10);
    // at t=0.25/2: t=0.125, freq=2 → phase=2π*2*0.125=π/2 → sin(π/2)=1 → force=10
    expect(c(a, {}, 0.125, 0)[0]).toBeCloseTo(10, 5);
  });

  it('respects phase offset', () => {
    const a = agent2d();
    const c = oscillate([1, 0], 5, 1, Math.PI / 2);
    // at t=0: sin(π/2)=1 → force=5
    expect(c(a, {}, 0, 0)[0]).toBeCloseTo(5, 5);
  });

  it('returns a new array each call', () => {
    const a = agent2d();
    const c = oscillate([1, 0], 1, 1);
    expect(c(a, {}, 0, 0)).not.toBe(c(a, {}, 0, 0));
  });
});

describe('drift', () => {
  const linearNoise = (x: number) => x;

  it('defaults on for all axes present on the agent', () => {
    const force = drift({ noiseFn: linearNoise });
    expect(force(agent2d(), {}, 1, 0)).toEqual([25, 50025]);
    expect(force(agent3d(), {}, 1, 0)).toEqual([25, 50025, 100025]);
  });

  it('keeps default-on mode when an axis is only false', () => {
    const force = drift({ x: false, noiseFn: linearNoise });
    expect(force(agent3d(), {}, 1, 0)).toEqual([0, 50025, 100025]);
  });

  it('uses per-axis mode when any axis is true', () => {
    const force = drift({ strength: 80, x: true, noiseFn: linearNoise });
    expect(force(agent3d(), {}, 2, 0)).toEqual([80, 0, 0]);
  });

  it('uses per-axis mode when any axis is an object', () => {
    const force = drift({
      scale: 0.5,
      x: { strength: 80 },
      y: { strength: 200, scale: 0.2 },
      noiseFn: linearNoise,
    });

    expect(force(agent3d(), {}, 2, 0)).toEqual([80, 200080, 0]);
  });

  it('treats false as an explicit off marker in per-axis mode', () => {
    const force = drift({ x: true, y: false, noiseFn: linearNoise });
    expect(force(agent3d(), {}, 1, 0)).toEqual([25, 0, 0]);
  });

  it('resolves per-axis config before top-level config before factory defaults', () => {
    const force = drift({
      strength: 10,
      scale: 2,
      seed: 5,
      x: { strength: 3, scale: 4, seed: 7 },
      y: true,
      noiseFn: linearNoise,
    });

    expect(force(agent3d(), {}, 2, 0)).toEqual([45, 90, 0]);
  });

  it('is deterministic for identical built-in noise configs', () => {
    const a = drift({ strength: 20, scale: 0.75, x: true, y: true });
    const b = drift({ strength: 20, scale: 0.75, x: true, y: true });
    const agent = agent2d();

    const seqA = [0, 0.1, 0.2, 0.3].map((t) => a(agent, {}, t, 0.016));
    const seqB = [0, 0.1, 0.2, 0.3].map((t) => b(agent, {}, t, 0.016));

    expect(seqA).toEqual(seqB);
  });

  it("keeps one axis's seed independent from another axis", () => {
    const a = drift({ x: { seed: 1 }, y: { seed: 2 }, noiseFn: linearNoise });
    const b = drift({ x: { seed: 9 }, y: { seed: 2 }, noiseFn: linearNoise });

    expect(a(agent2d(), {}, 0, 0)[0]).not.toBe(b(agent2d(), {}, 0, 0)[0]);
    expect(a(agent2d(), {}, 0, 0)[1]).toBe(b(agent2d(), {}, 0, 0)[1]);
  });

  it('ignores z config for a 2D agent and uses it for a 3D agent', () => {
    const force = drift({ z: { strength: 10, seed: 3 }, noiseFn: linearNoise });
    expect(force(agent2d(), {}, 0, 0)).toEqual([0, 0]);
    expect(force(agent3d(), {}, 0, 0)).toEqual([0, 0, 30]);
  });

  it('throws invalid config errors at creation time', () => {
    expect(() => drift({ strength: -1 })).toThrow();
    expect(() => drift({ x: { strength: Infinity } })).toThrow();
    expect(() => drift({ scale: 0 })).toThrow();
    expect(() => drift({ y: { scale: NaN } })).toThrow();
    expect(() => drift({ seed: Infinity })).toThrow();
    expect(() => drift({ noiseFn: 'bad' as never })).toThrow();
  });

  it('returns a new vector each call', () => {
    const force = drift();
    expect(force(agent2d(), {}, 0, 0)).not.toBe(force(agent2d(), {}, 0, 0));
  });
});

describe('constant', () => {
  it('always returns the same value regardless of agent state', () => {
    const a1 = agent2d([0, 0], [10, -5]);
    const a2 = agent2d([100, 200], [1, 2]);
    const c = constant([0, -9.8]);
    expect(c(a1, {}, 0, 0)).toEqual([0, -9.8]);
    expect(c(a2, {}, 99, 0.032)).toEqual([0, -9.8]);
  });

  it('returns a new array each call (no mutation)', () => {
    const c = constant([1, 2]);
    const f1 = c(agent2d(), {}, 0, 0);
    const f2 = c(agent2d(), {}, 0, 0);
    expect(f1).not.toBe(f2);
    f1[0] = 999;
    expect(f2[0]).toBe(1); // original vec not mutated
  });
});

describe('tangential (2D)', () => {
  it('produces force perpendicular to velocity', () => {
    const a = agent2d([0, 0], [1, 0]);
    const force = tangential(1)(a, {}, 0, 0);
    expect(dot2(force, a.velocity)).toBeCloseTo(0, 10);
  });

  it('scales with k', () => {
    const a = agent2d([0, 0], [3, 4]);
    const f1 = tangential(1)(a, {}, 0, 0);
    const f2 = tangential(2)(a, {}, 0, 0);
    expect(len2(f2)).toBeCloseTo(len2(f1) * 2, 5);
  });

  it('returns zero for zero velocity', () => {
    const a = agent2d([0, 0], [0, 0]);
    expect(tangential(1)(a, {}, 0, 0)).toEqual([0, 0]);
  });
});

describe('tangentialAround (3D)', () => {
  it('produces force perpendicular to velocity', () => {
    const a = agent3d([0, 0, 0], [1, 0, 0]);
    const axis = [0, 0, 1];
    const force = tangentialAround(axis, 5)(a, {}, 0, 0);
    expect(dot3(force, a.velocity)).toBeCloseTo(0, 10);
  });

  it('scales with k', () => {
    const a = agent3d([0, 0, 0], [1, 0, 0]);
    const axis = [0, 0, 1];
    const f1 = tangentialAround(axis, 1)(a, {}, 0, 0);
    const f2 = tangentialAround(axis, 3)(a, {}, 0, 0);
    const len3 = (v: number[]) => Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    expect(len3(f2)).toBeCloseTo(len3(f1) * 3, 5);
  });

  it('returns zero when velocity is parallel to axis', () => {
    const a = agent3d([0, 0, 0], [0, 0, 1]);
    const force = tangentialAround([0, 0, 1], 5)(a, {}, 0, 0);
    const len3 = (v: number[]) => Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    expect(len3(force)).toBeCloseTo(0, 10);
  });
});

describe('integration: attract + damp converges toward target', () => {
  it('agent moves toward target and does not overshoot badly', () => {
    const target = [100, 0];
    const a = agent2d([0, 0]);
    // default falloff = linear distance, damp(2) = overdamped spring
    a.add(attract(() => target));
    a.add(damp(2));
    for (let i = 0; i < 300; i++) step(a, {}, i * 0.016, 0.016);
    expect(a.position[0]).toBeGreaterThan(60);
    expect(a.position[0]).toBeLessThan(110);
  });
});

describe('integration: drift composition', () => {
  it('drift + damp stays bounded over a finite idle window', () => {
    const a = agent2d([0, 0]);
    a.add(drift({ strength: 5, scale: 0.5 }));
    a.add(damp(3));

    let peak = 0;
    for (let i = 0; i < 300; i++) {
      step(a, {}, i * 0.016, 0.016);
      peak = Math.max(peak, len2(a.position));
    }

    expect(peak).toBeLessThan(30);
  });

  it('drift + soft anchor + damp recovers after an external force is removed', () => {
    const home = [0, 0];
    const a = agent2d([0, 0]);
    const push = constant([80, 0]);

    a.add(drift({ strength: 3, scale: 0.5 }));
    a.add(attract(() => home, (d) => d * 3));
    a.add(damp(5));
    a.add(push);

    for (let i = 0; i < 90; i++) step(a, {}, i * 0.016, 0.016);
    const disturbedDistance = len2(a.position);

    a.remove(push);
    for (let i = 90; i < 500; i++) step(a, {}, i * 0.016, 0.016);

    expect(len2(a.position)).toBeLessThan(disturbedDistance / 2);
  });

  it('strong attraction dominates drift while drift still contributes variation', () => {
    const target = [100, 0];
    const withDrift = agent2d([0, 0]);
    const withoutDrift = agent2d([0, 0]);

    withDrift.add(drift({ strength: 2, scale: 0.5 }));
    withDrift.add(attract(() => target, (d) => d * 8));
    withoutDrift.add(attract(() => target, (d) => d * 8));

    step(withDrift, {}, 0.25, 0.016);
    step(withoutDrift, {}, 0.25, 0.016);

    expect(withDrift.position[0]).toBeGreaterThan(0);
    expect(withDrift.position[0]).toBeCloseTo(withoutDrift.position[0], 1);
    expect(withDrift.position).not.toEqual(withoutDrift.position);
  });
});
