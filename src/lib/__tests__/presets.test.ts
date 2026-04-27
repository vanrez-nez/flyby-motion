import { describe, it, expect } from 'vitest';
import { Agent } from '../Agent';
import { step } from '../step';
import {
  drift,
  flee,
  float,
  follow,
  orbit,
  repelFrom,
  snapTo,
} from '../presets';

const W = {};

const run = (agent: Agent, steps: number, dt = 0.016) => {
  for (let i = 0; i < steps; i++) step(agent, W, i * dt, dt);
};

const distance = (a: number[], b: number[]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('presets.follow', () => {
  it('settles near a target', () => {
    const agent = new Agent({ position: [0, 0], maxSpeed: 600, maxForce: 1200 });
    agent.add(follow(() => [100, 0]));
    run(agent, 300);
    expect(distance(agent.position, [100, 0])).toBeLessThan(10);
  });
});

describe('presets.snapTo', () => {
  it('reaches the target faster than follow with defaults', () => {
    const target = [100, 0];
    const follower = new Agent({ position: [0, 0], maxSpeed: 1000, maxForce: 2000 });
    const snapper = new Agent({ position: [0, 0], maxSpeed: 1000, maxForce: 2000 });
    follower.add(follow(() => target));
    snapper.add(snapTo(() => target));

    run(follower, 60);
    run(snapper, 60);

    expect(distance(snapper.position, target)).toBeLessThan(distance(follower.position, target));
  });
});

describe('presets.flee', () => {
  it('does not push when the source is outside range', () => {
    const agent = new Agent({ position: [500, 0] });
    const force = flee(() => [0, 0], { strength: 100, range: 100, damp: 0 });
    expect(force(agent, W, 0, 0.016)).toEqual([0, 0]);
  });
});

describe('presets.float', () => {
  it('changes force over time', () => {
    const agent = new Agent();
    const force = float({ amplitude: 20, freq: 0.5 });
    expect(force(agent, W, 0, 0.016)).not.toEqual(force(agent, W, 0.5, 0.016));
  });
});

describe('presets.repelFrom', () => {
  it('returns zero outside range', () => {
    const agent = new Agent({ position: [200, 0] });
    const force = repelFrom(() => [0, 0], { range: 100, strength: 500 });
    expect(force(agent, W, 0, 0.016)).toEqual([0, 0]);
  });
});

describe('presets.drift', () => {
  it('approaches terminal velocity in the requested direction', () => {
    const agent = new Agent({ velocity: [0, 0], maxSpeed: 500 });
    agent.add(drift({ direction: [1, 0], speed: 50, damp: 2 }));
    run(agent, 300);
    expect(agent.velocity[0]).toBeCloseTo(50, 0);
    expect(Math.abs(agent.velocity[1])).toBeLessThan(0.001);
  });
});

describe('presets.orbit', () => {
  it('pushes outward when inside radius', () => {
    const agent = new Agent({ position: [50, 0], velocity: [0, 0] });
    const force = orbit(() => [0, 0], {
      radius: 100,
      strength: 10,
      speed: 0,
      damp: 0,
    });
    expect(force(agent, W, 0, 0.016)[0]).toBeGreaterThan(0);
  });

  it('pushes inward when outside radius', () => {
    const agent = new Agent({ position: [150, 0], velocity: [0, 0] });
    const force = orbit(() => [0, 0], {
      radius: 100,
      strength: 10,
      speed: 0,
      damp: 0,
    });
    expect(force(agent, W, 0, 0.016)[0]).toBeLessThan(0);
  });

  it('adds tangential motion by default', () => {
    const agent = new Agent({ position: [100, 0], velocity: [0, 0] });
    const force = orbit(() => [0, 0], {
      radius: 100,
      strength: 10,
      speed: 50,
      damp: 1,
    });
    expect(Math.abs(force(agent, W, 0, 0.016)[1])).toBeGreaterThan(0);
  });
});
