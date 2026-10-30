import { describe, expect, it } from 'vitest';
import { createWorld, terrainHeight } from '../world';
import { createMission, type HudEvent, type MissionState } from '../missionScript';

/** Runs the mission headless at 60 fps and records what the HUD would show. */
function fly(seconds: number) {
  const world = createWorld();
  const events: HudEvent[] = [];
  const mission = createMission(world, (event) => events.push(event));
  const dt = 1 / 60;
  const states: MissionState[] = [];
  let minClearance = Infinity;
  let maxSpeed = 0;
  let spireHits = 0;
  for (let t = dt; t <= seconds; t += dt) {
    const state = mission.update(t, dt);
    states.push(state);
    const [x, y, z] = mission.drone.position;
    minClearance = Math.min(minClearance, y - terrainHeight(x, z));
    maxSpeed = Math.max(maxSpeed, Math.hypot(...mission.drone.velocity));
    for (const spire of world.spires) {
      const [sx, sy, sz] = spire.position;
      if (y < sy + spire.height && Math.hypot(x - sx, z - sz) < spire.radius * 0.6) spireHits++;
    }
  }
  return { world, mission, events, states, minClearance, maxSpeed, spireHits };
}

describe('drone mission', () => {
  it('runs every phase in order and loops', () => {
    const { mission, states } = fly(80);
    const codes = [...new Set(states.map((s) => s.phaseCode))];
    expect(codes).toEqual(['LAUNCH', 'NAV', 'AVOID', 'SCOUT', 'ACQUIRE', 'FOLLOW', 'HOLD', 'SEARCH', 'RTB']);
    // Past the loop length the mission starts over.
    expect(mission.duration).toBeLessThan(80);
    expect(states[states.length - 1].missionTime).toBeLessThan(80 - mission.duration + 0.1);
  });

  /** Samples drone–target ground distance during a phase, after it has settled for `settle` seconds. */
  function distancesDuring(code: string, settle: number) {
    const world = createWorld();
    const run = createMission(world, () => {});
    const dt = 1 / 60;
    const out: number[] = [];
    let phaseStart = -1;
    for (let t = dt; t < run.duration; t += dt) {
      const state = run.update(t, dt);
      if (state.phaseCode !== code) continue;
      if (phaseStart < 0) phaseStart = t;
      if (t - phaseStart < settle) continue;
      const [a, b] = [run.drone.position, run.target.position];
      out.push(Math.hypot(a[0] - b[0], a[2] - b[2]));
    }
    return out;
  }

  const mean = (values: number[]) => values.reduce((s, v) => s + v, 0) / values.length;

  it('follows the target without sitting on it', () => {
    const distances = distancesDuring('FOLLOW', 2);
    expect(distances.length).toBeGreaterThan(0);
    expect(Math.min(...distances)).toBeGreaterThan(2.5);
    expect(mean(distances)).toBeLessThan(14);
  });

  it('loses the target once it escapes', () => {
    const distances = distancesDuring('SEARCH', 4);
    expect(mean(distances)).toBeGreaterThan(25);
  });

  it('lists the forces actually on the drone', () => {
    const world = createWorld();
    const mission = createMission(world, () => {});
    const state = mission.update(1 / 60, 1 / 60);
    expect(state.activeForces.map((f) => f.label)).toEqual(['ASCEND', 'HOVER', 'STABILIZE']);
    expect(mission.drone.forces.size).toBe(state.activeForces.length);
  });

  it('stays above ground, inside its speed limit, and clear of the spires', () => {
    const { minClearance, maxSpeed, spireHits } = fly(70);
    expect(Number.isFinite(minClearance)).toBe(true);
    expect(minClearance).toBeGreaterThan(-0.5);
    expect(maxSpeed).toBeLessThanOrEqual(11 + 1e-6);
    expect(spireHits).toBe(0);
  });

  it('emits the mission messages', () => {
    const { events } = fly(72);
    const texts = events.map((e) => e.text);
    for (const text of ['SYSTEMS ONLINE', 'OBSTACLE FIELD AHEAD', 'TARGET ACQUIRED', 'TRACKING', 'TARGET LOST', 'RETURN TO BASE']) {
      expect(texts).toContain(text);
    }
  });

  it('holds the keep-distance band around the target', () => {
    const distances = distancesDuring('HOLD', 3);
    expect(distances.length).toBeGreaterThan(0);
    expect(mean(distances)).toBeGreaterThan(7);
    expect(mean(distances)).toBeLessThan(15);
  });
});
