import { describe, it, expect } from 'vitest';
import { Agent } from '../Agent';
import { step } from '../step';
import { arrive, flee, orbit, pursue } from '../behaviors';

const run = (agent: Agent, steps: number, dt = 0.016) => {
  for (let i = 0; i < steps; i++) step(agent, {}, i * dt, dt);
};

const speed = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
const dist = (a: number[], b: number[]) =>
  Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));

describe('arrive', () => {
  // Start agent inside the slow-radius so the converging spring is active from t=0.
  // strength=5, slowR=100, damp=0.5 -> underdamped spring inside slowR, time constant ~7s.
  const setup = () => {
    const a = new Agent({ position: [40, 0] });
    a.add(arrive(() => [0, 0], { strength: 5, slowR: 100, damp: 0.5 }));
    return a;
  };

  it('velocity decreases to near-zero (agent slows and stops)', () => {
    const a = setup();
    run(a, 1500); // ~24s, well beyond the ~7s time constant
    expect(speed(a.velocity)).toBeLessThan(0.5);
  });

  it('agent ends up close to target', () => {
    const a = setup();
    run(a, 1200);
    expect(dist(a.position, [0, 0])).toBeLessThan(10);
  });

  it('distance to target decreases monotonically over long run', () => {
    const a = new Agent({ position: [40, 0] });
    a.add(arrive(() => [0, 0], { strength: 5, slowR: 100, damp: 0.5 }));
    const d0 = dist(a.position, [0, 0]);
    run(a, 500);
    const d1 = dist(a.position, [0, 0]);
    run(a, 500);
    const d2 = dist(a.position, [0, 0]);
    expect(d1).toBeLessThan(d0);
    expect(d2).toBeLessThan(d1);
  });

  it('supports dynamic targets', () => {
    let target = [40, 0];
    const a = new Agent({ position: [0, 0] });
    a.add(arrive(() => target, { strength: 5, slowR: 100, damp: 0.5 }));
    run(a, 400);
    target = [0, 40]; // shift target to y-axis
    run(a, 400);
    // agent should have turned — now moving toward y-axis target
    expect(a.position[1]).toBeGreaterThan(0);
  });
});

describe('flee', () => {
  it('agent moves away from source over time', () => {
    const source = [0, 0];
    const a = new Agent({ position: [10, 0] });
    const d0 = dist(a.position, source);
    a.add(flee(() => source, { strength: 1, damp: 0.5 }));
    run(a, 200);
    expect(dist(a.position, source)).toBeGreaterThan(d0);
  });

  it('agent moves in correct direction (away from source)', () => {
    const a = new Agent({ position: [5, 0] });
    a.add(flee(() => [0, 0], { strength: 2, damp: 0.5 }));
    run(a, 100);
    expect(a.position[0]).toBeGreaterThan(5);
  });

  it('velocity stabilizes (damp prevents runaway)', () => {
    const a = new Agent({ position: [5, 0] });
    a.add(flee(() => [0, 0], { strength: 1, damp: 2 }));
    run(a, 200);
    const v1 = speed(a.velocity);
    run(a, 200);
    const v2 = speed(a.velocity);
    // velocity shouldn't grow unboundedly
    expect(Math.abs(v2 - v1)).toBeLessThan(5);
  });
});

describe('orbit', () => {
  // Strong tangential, weak centripetal → agent stays far from center.
  const setup = () => {
    const a = new Agent({ position: [30, 0], velocity: [0, 3] });
    a.add(orbit(() => [0, 0], { attractK: 0.5, tangentK: 4, damp: 0 }));
    return a;
  };

  it('agent maintains distance from center (tangential keeps it moving)', () => {
    const a = setup();
    run(a, 300);
    expect(dist(a.position, [0, 0])).toBeGreaterThan(5);
  });

  it('agent moves in both x and y (circular motion, not linear)', () => {
    const a = setup();
    run(a, 300);
    // After many steps both axes should be non-trivially occupied
    expect(Math.abs(a.position[1])).toBeGreaterThan(1);
  });

  it('orbit with high damp spirals inward', () => {
    const a = new Agent({ position: [30, 0], velocity: [0, 5] });
    a.add(orbit(() => [0, 0], { attractK: 3, tangentK: 1, damp: 5 }));
    const d0 = dist(a.position, [0, 0]);
    run(a, 400);
    expect(dist(a.position, [0, 0])).toBeLessThan(d0);
  });
});

describe('pursue', () => {
  // pursue uses falloff.arrive internally, so it converges like arrive.
  it('agent catches a stationary target (inside slowR)', () => {
    const leader = { position: [40, 0], velocity: [0, 0] };
    const a = new Agent({ position: [0, 0] });
    a.add(pursue(() => leader, { strength: 5, slowR: 100, damp: 0.5, lookahead: 0 }));
    run(a, 1200);
    expect(dist(a.position, leader.position)).toBeLessThan(10);
  });

  it('pursuer with lookahead intercepts moving target sooner', () => {
    // Target moves along +y. Pursuer using lookahead gets ahead of naive direct attract.
    const leader = { position: [0, 0] as number[], velocity: [0, 5] };

    const aDirect = new Agent({ position: [40, 0] });
    aDirect.add(pursue(
      () => ({ position: [...leader.position], velocity: [0, 0] }),
      { strength: 5, slowR: 100, damp: 0.5, lookahead: 0 },
    ));

    const aPursuit = new Agent({ position: [40, 0] });
    aPursuit.add(pursue(() => leader, { strength: 5, slowR: 100, damp: 0.5, lookahead: 0.5 }));

    for (let i = 0; i < 300; i++) {
      leader.position = [leader.position[0], leader.position[1] + 5 * 0.016];
      step(aDirect, {}, i * 0.016, 0.016);
      step(aPursuit, {}, i * 0.016, 0.016);
    }

    const distDirect = dist(aDirect.position, leader.position);
    const distPursuit = dist(aPursuit.position, leader.position);
    expect(distPursuit).toBeLessThan(distDirect);
  });
});
