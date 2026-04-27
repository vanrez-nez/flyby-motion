import { describe, it, expect } from 'vitest';
import { falloff } from '../falloff';

describe('falloff.constant', () => {
  it('always returns k regardless of distance', () => {
    expect(falloff.constant(5)(0)).toBe(5);
    expect(falloff.constant(5)(100)).toBe(5);
    expect(falloff.constant(5)(0.001)).toBe(5);
  });
});

describe('falloff.linear', () => {
  it('returns k * distance', () => {
    expect(falloff.linear(2)(3)).toBe(6);
    expect(falloff.linear(1)(0)).toBe(0);
    expect(falloff.linear(3)(4)).toBe(12);
  });
});

describe('falloff.invSquare', () => {
  it('approximates k at distance 1 (within 0.01)', () => {
    expect(falloff.invSquare(1)(1)).toBeCloseTo(1, 2);
  });

  it('grows as distance approaches 0 (eps prevents infinity)', () => {
    const f = falloff.invSquare(1);
    expect(isFinite(f(0))).toBe(true);
    expect(f(0)).toBeGreaterThan(f(1));
  });

  it('respects custom eps', () => {
    const tight = falloff.invSquare(1, 0.0001);
    const loose = falloff.invSquare(1, 1);
    expect(tight(0)).toBeGreaterThan(loose(0));
  });
});

describe('falloff.arrive', () => {
  it('ramps linearly inside slowR', () => {
    expect(falloff.arrive(10, 5)(3)).toBeCloseTo(6, 10); // 3/5 * 10
    expect(falloff.arrive(10, 5)(0)).toBeCloseTo(0, 10);
  });

  it('returns k at and beyond slowR', () => {
    expect(falloff.arrive(10, 5)(5)).toBe(10);
    expect(falloff.arrive(10, 5)(100)).toBe(10);
  });
});

describe('falloff.exponential', () => {
  it('returns k at distance 0', () => {
    expect(falloff.exponential(10, 0.1)(0)).toBeCloseTo(10, 10);
  });

  it('decays toward 0 as distance grows', () => {
    const f = falloff.exponential(10, 0.5);
    expect(f(10)).toBeLessThan(f(0));
    expect(f(100)).toBeCloseTo(0, 5);
  });

  it('faster falloff decays sooner', () => {
    const slow = falloff.exponential(1, 0.1);
    const fast = falloff.exponential(1, 2);
    expect(fast(5)).toBeLessThan(slow(5));
  });
});

describe('falloff.within', () => {
  it('returns 0 beyond maxR', () => {
    expect(falloff.within(falloff.constant(5), 10)(15)).toBe(0);
    expect(falloff.within(falloff.constant(5), 10)(10.0001)).toBe(0);
  });

  it('passes through fn within maxR', () => {
    expect(falloff.within(falloff.constant(5), 10)(5)).toBe(5);
    expect(falloff.within(falloff.linear(2), 10)(3)).toBe(6);
  });
});

describe('falloff.beyond', () => {
  it('returns 0 inside minR', () => {
    expect(falloff.beyond(falloff.constant(5), 2)(1)).toBe(0);
    expect(falloff.beyond(falloff.constant(5), 2)(0)).toBe(0);
  });

  it('passes through fn outside minR', () => {
    expect(falloff.beyond(falloff.constant(5), 2)(3)).toBe(5);
    expect(falloff.beyond(falloff.linear(2), 1)(4)).toBe(8);
  });
});

describe('composition', () => {
  it('within(beyond(invSquare)) composes correctly', () => {
    const f = falloff.within(falloff.beyond(falloff.invSquare(1), 0.5), 20);
    expect(f(0.1)).toBe(0);      // inside dead zone
    expect(f(25)).toBe(0);       // outside range
    expect(f(1)).toBeGreaterThan(0); // in the active band
  });

  it('arrive with within is effectively arrive', () => {
    const f = falloff.within(falloff.arrive(10, 5), 100);
    expect(f(3)).toBeCloseTo(6, 10);
    expect(f(200)).toBe(0);
  });
});
