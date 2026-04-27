import { describe, it, expect } from 'vitest';
import { Agent } from '../Agent';
import { constant, damp } from '../forces';
import { scale, gate, during, fadeIn, fadeOut, sum } from '../modifiers';

const agent = () => new Agent({ position: [0, 0], velocity: [2, 0] });
const W = {};

describe('scale', () => {
  it('scale(c, 0) produces zero vector', () => {
    const f = scale(constant([10, 5]), 0)(agent(), W, 0, 0.016);
    expect(f).toEqual([0, 0]);
  });

  it('scale(c, 2) doubles the force', () => {
    const f = scale(constant([3, -1]), 2)(agent(), W, 0, 0.016);
    expect(f[0]).toBeCloseTo(6, 10);
    expect(f[1]).toBeCloseTo(-2, 10);
  });

  it('scale(c, -1) negates the force', () => {
    const f = scale(constant([4, 0]), -1)(agent(), W, 0, 0.016);
    expect(f[0]).toBeCloseTo(-4, 10);
  });
});

describe('gate', () => {
  it('gate(false, c) produces zero vector', () => {
    const f = gate(() => false, constant([10, 5]))(agent(), W, 0, 0.016);
    expect(f[0]).toBe(0);
    expect(f[1]).toBe(0);
  });

  it('gate(true, c) passes through the force', () => {
    const f = gate(() => true, constant([10, 5]))(agent(), W, 0, 0.016);
    expect(f).toEqual([10, 5]);
  });

  it('predicate receives agent, world, t', () => {
    const calls: [unknown, unknown, number][] = [];
    const a = agent();
    gate(
      (ag, w, t) => { calls.push([ag, w, t]); return true; },
      constant([0, 0]),
    )(a, W, 7, 0.016);
    expect(calls[0][0]).toBe(a);
    expect(calls[0][1]).toBe(W);
    expect(calls[0][2]).toBe(7);
  });
});

describe('during', () => {
  const c = constant([10, 0]);

  it('returns c force within window', () => {
    const f = during(1, 2, c)(agent(), W, 1.5, 0.016);
    expect(f).toEqual([10, 0]);
  });

  it('returns zero before window', () => {
    const f = during(1, 2, c)(agent(), W, 0, 0.016);
    expect(f[0]).toBe(0);
  });

  it('returns zero after window', () => {
    const f = during(1, 2, c)(agent(), W, 3, 0.016);
    expect(f[0]).toBe(0);
  });

  it('returns c force at exactly start and end', () => {
    expect(during(1, 2, c)(agent(), W, 1, 0)[0]).toBe(10);
    expect(during(1, 2, c)(agent(), W, 2, 0)[0]).toBe(10);
  });
});

describe('fadeIn', () => {
  it('at first call (t=0) force is zero', () => {
    const f = fadeIn(1, constant([10, 0]))(agent(), W, 0, 0);
    expect(f[0]).toBeCloseTo(0, 10);
  });

  it('at t=0.5 force is half (birth at t=0)', () => {
    const c = fadeIn(1, constant([10, 0]));
    const a = agent();
    c(a, W, 0, 0);     // birth
    const f = c(a, W, 0.5, 0);
    expect(f[0]).toBeCloseTo(5, 5);
  });

  it('at t>=duration force is full', () => {
    const c = fadeIn(1, constant([10, 0]));
    const a = agent();
    c(a, W, 0, 0);     // birth
    expect(c(a, W, 1, 0)[0]).toBeCloseTo(10, 10);
    expect(c(a, W, 2, 0)[0]).toBeCloseTo(10, 10);
  });

  it('birth time is when first invoked, not t=0', () => {
    const c = fadeIn(1, constant([10, 0]));
    const a = agent();
    c(a, W, 5, 0);     // born at t=5
    const f = c(a, W, 5.5, 0);
    expect(f[0]).toBeCloseTo(5, 5); // local t=0.5 → k=0.5
  });
});

describe('fadeOut', () => {
  it('at first call force is full', () => {
    const f = fadeOut(1, constant([10, 0]))(agent(), W, 0, 0);
    expect(f[0]).toBeCloseTo(10, 10);
  });

  it('at t=0.5 force is half', () => {
    const c = fadeOut(1, constant([10, 0]));
    const a = agent();
    c(a, W, 0, 0);
    expect(c(a, W, 0.5, 0)[0]).toBeCloseTo(5, 5);
  });

  it('at t>=duration force is zero', () => {
    const c = fadeOut(1, constant([10, 0]));
    const a = agent();
    c(a, W, 0, 0);
    expect(c(a, W, 1, 0)[0]).toBeCloseTo(0, 10);
    expect(c(a, W, 5, 0)[0]).toBeCloseTo(0, 10);
  });
});

describe('sum', () => {
  it('sums forces from all forces', () => {
    const f = sum(constant([3, 0]), constant([0, 4]))(agent(), W, 0, 0.016);
    expect(f[0]).toBeCloseTo(3, 10);
    expect(f[1]).toBeCloseTo(4, 10);
  });

  it('sum with zero forces returns zero', () => {
    const f = sum()(agent(), W, 0, 0.016);
    expect(f).toEqual([0, 0]);
  });

  it('sum passes world, t, dt through to each force', () => {
    const recorded: number[] = [];
    const recorder = (_a: Agent, _w: unknown, t: number) => { recorded.push(t); return [0, 0]; };
    sum(recorder, recorder)(agent(), W, 42, 0.016);
    expect(recorded).toEqual([42, 42]);
  });

  it('composes with scale and gate', () => {
    const f = sum(
      scale(constant([2, 0]), 3),
      gate(() => false, constant([999, 0])),
      constant([0, 1]),
    )(agent(), W, 0, 0);
    expect(f[0]).toBeCloseTo(6, 10);
    expect(f[1]).toBeCloseTo(1, 10);
  });

  it('velocity-dependent force still receives agent', () => {
    const a = new Agent({ velocity: [4, 0] });
    const f = sum(damp(1))(a, W, 0, 0.016);
    expect(f[0]).toBeCloseTo(-4, 10);
  });
});
