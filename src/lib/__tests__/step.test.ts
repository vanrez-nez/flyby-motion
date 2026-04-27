import { describe, it, expect } from 'vitest';
import { Agent } from '../Agent';
import { step } from '../step';

describe('step', () => {
  it('runs without error on Agent with zero forces', () => {
    const agent = new Agent();
    expect(() => step(agent, {}, 0, 0.016)).not.toThrow();
    expect(agent.position).toEqual([0, 0]);
    expect(agent.velocity).toEqual([0, 0]);
  });

  it('does nothing for dt = 0', () => {
    const agent = new Agent({ position: [1, 2], velocity: [3, 4] });
    let calls = 0;
    agent.add(() => {
      calls++;
      return [10, 0];
    });

    expect(() => step(agent, {}, 0, 0)).not.toThrow();
    expect(calls).toBe(0);
    expect(agent.position).toEqual([1, 2]);
    expect(agent.velocity).toEqual([3, 4]);
  });

  it('does nothing for dt < 0', () => {
    const agent = new Agent({ position: [1, 2], velocity: [3, 4] });
    let calls = 0;
    agent.add(() => {
      calls++;
      return [10, 0];
    });

    expect(() => step(agent, {}, 0, -0.016)).not.toThrow();
    expect(calls).toBe(0);
    expect(agent.position).toEqual([1, 2]);
    expect(agent.velocity).toEqual([3, 4]);
  });

  it('constant force produces parabolic position', () => {
    // force=[1,0], mass=1, dt=0.1 for 10 steps
    // Each step k: v += 0.1 (after step k, v = k*0.1), pos += v*dt
    // pos_x = sum_{k=1}^{10} k * 0.01 = 0.01 * 55 = 0.55
    const agent = new Agent({ position: [0, 0], velocity: [0, 0] });
    agent.add(() => [1, 0]);
    const dt = 0.1;
    for (let i = 0; i < 10; i++) step(agent, {}, i * dt, dt);
    const n = 10;
    const expected = dt * dt * (n * (n + 1)) / 2; // 0.55
    expect(agent.position[0]).toBeCloseTo(expected, 10);
    expect(agent.position[1]).toBeCloseTo(0, 10);
  });

  it('snapshots forces — removal during step does not skip current step', () => {
    const agent = new Agent();
    let calls = 0;
    const c = agent.add((_a, _w, _t, _dt) => {
      agent.remove(c);
      calls++;
      return [1, 0];
    });
    step(agent, {}, 0, 0.1);
    expect(calls).toBe(1);
    // removed — second step should not invoke it
    step(agent, {}, 0.1, 0.1);
    expect(calls).toBe(1);
  });

  it('is deterministic — same inputs produce same outputs', () => {
    const world = {};
    const contrib = () => [0.3, -0.1];

    const makeAgent = () => {
      const a = new Agent({ position: [1, 2], velocity: [0.5, -0.5], mass: 2 });
      a.add(contrib);
      return a;
    };

    const a1 = makeAgent();
    const a2 = makeAgent();
    step(a1, world, 1, 0.016);
    step(a2, world, 1, 0.016);

    expect(a1.position).toEqual(a2.position);
    expect(a1.velocity).toEqual(a2.velocity);
  });

  it('clamps total force to maxForce', () => {
    // force=100, maxForce=1, mass=1, dt=1 → velocity should be ≈ 1, not 100
    const agent = new Agent({ maxForce: 1 });
    agent.add(() => [100, 0]);
    step(agent, {}, 0, 1);
    expect(agent.velocity[0]).toBeCloseTo(1, 5);
    expect(agent.velocity[1]).toBeCloseTo(0, 10);
  });

  it('clamps velocity to maxSpeed', () => {
    // Start with large velocity, clamp to maxSpeed=5 during step
    const agent = new Agent({ velocity: [100, 0], maxSpeed: 5 });
    agent.add(() => [1, 0]); // pushes in same direction, but gets clamped
    step(agent, {}, 0, 0.016);
    const speed = Math.sqrt(agent.velocity[0] ** 2 + agent.velocity[1] ** 2);
    expect(speed).toBeCloseTo(5, 5);
  });

  it('works with 3D agents', () => {
    const agent = new Agent({ position: [0, 0, 0], velocity: [0, 0, 0] });
    agent.add(() => [0, 0, 1]);
    step(agent, {}, 0, 1);
    expect(agent.position[2]).toBeCloseTo(1, 5);
  });

  it('throws for unsupported dimension', () => {
    const agent = new Agent({ position: [0, 0, 0, 0] }); // 4D
    expect(() => step(agent, {}, 0, 0.016)).toThrow(RangeError);
  });
});
