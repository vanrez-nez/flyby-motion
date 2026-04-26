import { describe, it, expect } from 'vitest';
import { mag } from '../magnitudes';

describe('mag.constant', () => {
  it('always returns k regardless of distance', () => {
    expect(mag.constant(5)(0)).toBe(5);
    expect(mag.constant(5)(100)).toBe(5);
    expect(mag.constant(5)(0.001)).toBe(5);
  });
});

describe('mag.linear', () => {
  it('returns k * distance', () => {
    expect(mag.linear(2)(3)).toBe(6);
    expect(mag.linear(1)(0)).toBe(0);
    expect(mag.linear(3)(4)).toBe(12);
  });
});

describe('mag.invSquare', () => {
  it('approximates k at distance 1 (within 0.01)', () => {
    expect(mag.invSquare(1)(1)).toBeCloseTo(1, 2);
  });

  it('grows as distance approaches 0 (eps prevents infinity)', () => {
    const f = mag.invSquare(1);
    expect(isFinite(f(0))).toBe(true);
    expect(f(0)).toBeGreaterThan(f(1));
  });

  it('respects custom eps', () => {
    const tight = mag.invSquare(1, 0.0001);
    const loose = mag.invSquare(1, 1);
    expect(tight(0)).toBeGreaterThan(loose(0));
  });
});

describe('mag.arrive', () => {
  it('ramps linearly inside slowR', () => {
    expect(mag.arrive(10, 5)(3)).toBeCloseTo(6, 10); // 3/5 * 10
    expect(mag.arrive(10, 5)(0)).toBeCloseTo(0, 10);
  });

  it('returns k at and beyond slowR', () => {
    expect(mag.arrive(10, 5)(5)).toBe(10);
    expect(mag.arrive(10, 5)(100)).toBe(10);
  });
});

describe('mag.exponential', () => {
  it('returns k at distance 0', () => {
    expect(mag.exponential(10, 0.1)(0)).toBeCloseTo(10, 10);
  });

  it('decays toward 0 as distance grows', () => {
    const f = mag.exponential(10, 0.5);
    expect(f(10)).toBeLessThan(f(0));
    expect(f(100)).toBeCloseTo(0, 5);
  });

  it('faster falloff decays sooner', () => {
    const slow = mag.exponential(1, 0.1);
    const fast = mag.exponential(1, 2);
    expect(fast(5)).toBeLessThan(slow(5));
  });
});

describe('mag.rangeLimit', () => {
  it('returns 0 beyond maxR', () => {
    expect(mag.rangeLimit(mag.constant(5), 10)(15)).toBe(0);
    expect(mag.rangeLimit(mag.constant(5), 10)(10.0001)).toBe(0);
  });

  it('passes through fn within maxR', () => {
    expect(mag.rangeLimit(mag.constant(5), 10)(5)).toBe(5);
    expect(mag.rangeLimit(mag.linear(2), 10)(3)).toBe(6);
  });
});

describe('mag.deadZone', () => {
  it('returns 0 inside minR', () => {
    expect(mag.deadZone(mag.constant(5), 2)(1)).toBe(0);
    expect(mag.deadZone(mag.constant(5), 2)(0)).toBe(0);
  });

  it('passes through fn outside minR', () => {
    expect(mag.deadZone(mag.constant(5), 2)(3)).toBe(5);
    expect(mag.deadZone(mag.linear(2), 1)(4)).toBe(8);
  });
});

describe('composition', () => {
  it('rangeLimit(deadZone(invSquare)) composes correctly', () => {
    const f = mag.rangeLimit(mag.deadZone(mag.invSquare(1), 0.5), 20);
    expect(f(0.1)).toBe(0);      // inside dead zone
    expect(f(25)).toBe(0);       // outside range
    expect(f(1)).toBeGreaterThan(0); // in the active band
  });

  it('arrive with rangeLimit is effectively arrive', () => {
    const f = mag.rangeLimit(mag.arrive(10, 5), 100);
    expect(f(3)).toBeCloseTo(6, 10);
    expect(f(200)).toBe(0);
  });
});
