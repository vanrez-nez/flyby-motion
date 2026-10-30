import { describe, expect, it } from 'vitest';
import { createWorld, terrainHeight } from '../world';
import { createMission, type HudEvent, type MissionState } from '../missionScript';
import { createObjectives, REACHED_RADIUS } from '../objectives';

const DT = 1 / 60;

interface Sample {
  state: MissionState;
  drone: number[];
  velocity: number[];
  target: number[];
}

/** Flies one full loop headless at 60 fps and records every frame. */
function flyLoop() {
  const world = createWorld();
  const events: HudEvent[] = [];
  const mission = createMission(world, (event) => events.push(event));
  const samples: Sample[] = [];
  for (let t = DT; t < mission.duration; t += DT) {
    const state = mission.update(t, DT);
    samples.push({ state, drone: [...mission.drone.position], velocity: [...mission.drone.velocity], target: [...mission.target.position] });
  }
  return { world, mission, events, samples };
}

const run = flyLoop();
const during = (code: string, settle = 0) => {
  const all = run.samples.filter((s) => s.state.phaseCode === code);
  return all.slice(Math.round(settle / DT));
};
const ground = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const p95 = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length * 0.95)];

describe('drone mission', () => {
  it('runs every phase in order, then loops', () => {
    const codes = [...new Set(run.samples.map((s) => s.state.phaseCode))];
    expect(codes).toEqual(['LAUNCH', 'NAVIGATE', 'AVOID', 'APPROACH', 'PURSUE', 'ORBIT', 'RTB']);
    const mission = createMission(createWorld(), () => {});
    let state = mission.update(DT, DT);
    for (let t = 2 * DT; t < mission.duration + 1; t += DT) state = mission.update(t, DT);
    expect(state.phaseCode).toBe('LAUNCH');
  });

  it('lists the forces actually on the drone', () => {
    for (const { state } of run.samples.filter((_, i) => i % 300 === 0)) {
      expect(state.activeForces.length).toBeGreaterThan(0);
    }
    const mission = createMission(createWorld(), () => {});
    const state = mission.update(DT, DT);
    expect(mission.drone.forces.size).toBe(state.activeForces.length);
  });

  it('flies smoothly: steady altitude and gentle turns', () => {
    // Vertical speed stays small once launched: no bouncing over terrain.
    const cruising = run.samples.filter((s) => s.state.phaseCode !== 'LAUNCH');
    expect(p95(cruising.map((s) => Math.abs(s.velocity[1])))).toBeLessThan(0.6);
    // Turn rate (heading change) stays readable while moving.
    const turns: number[] = [];
    for (let i = 1; i < cruising.length; i++) {
      const [a, b] = [cruising[i - 1].velocity, cruising[i].velocity];
      if (Math.hypot(a[0], a[2]) < 2 || Math.hypot(b[0], b[2]) < 2) continue;
      let d = Math.atan2(b[0], b[2]) - Math.atan2(a[0], a[2]);
      d = Math.atan2(Math.sin(d), Math.cos(d));
      turns.push(Math.abs(d) / DT * 180 / Math.PI);
    }
    expect(p95(turns)).toBeLessThan(60);
  });

  it('flies a straight line to waypoint 1', () => {
    const xs = during('NAVIGATE').map((s) => s.drone[0]);
    const drift = Math.max(...xs) - Math.min(...xs);
    expect(drift).toBeLessThan(10.5); // from the pad at x=10 to the route at x=0, then straight
  });

  it('swerves around every slalom pillar without touching one', () => {
    const samples = during('AVOID');
    for (const spire of run.world.spires.slice(0, 3)) {
      const closest = Math.min(...samples.map((s) => ground(s.drone, spire.position) - spire.radius));
      expect(closest).toBeGreaterThan(1.2);
      expect(closest).toBeLessThan(6); // it does pass close: the swerve is visible
    }
    expect(ground(samples[samples.length - 1].drone, run.world.waypoints[1].position)).toBeLessThan(4);
  });

  it('closes on the target and never overlaps it', () => {
    const distances = during('PURSUE', 3).map((s) => ground(s.drone, s.target));
    expect(Math.min(...distances)).toBeGreaterThan(4);
    expect(distances[distances.length - 1]).toBeLessThan(12);
  });

  it('orbits at the keep-distance ring', () => {
    const distances = during('ORBIT', 3).map((s) => ground(s.drone, s.target));
    expect(Math.min(...distances)).toBeGreaterThan(7.5);
    expect(Math.max(...distances)).toBeLessThan(12.5);
  });

  it('returns to base and stays above ground', () => {
    const last = run.samples[run.samples.length - 1];
    expect(ground(last.drone, run.world.base)).toBeLessThan(5);
    const clearance = Math.min(...run.samples.map((s) => s.drone[1] - terrainHeight(s.drone[0], s.drone[2])));
    expect(clearance).toBeGreaterThan(0);
  });

  it('holds only while hovering at launch and orbiting the target', () => {
    const holding = new Set(run.samples.filter((s) => s.state.holding).map((s) => s.state.phaseCode));
    expect([...holding].sort()).toEqual(['LAUNCH', 'ORBIT']);
  });

  it('emits the mission messages', () => {
    const texts = run.events.map((e) => e.text);
    for (const text of ['SYSTEMS ONLINE', 'OBSTACLES AHEAD', 'REROUTING', 'TARGET ACQUIRED', 'HOLDING 10M · ORBIT', 'TARGET RELEASED · RTB']) {
      expect(texts).toContain(text);
    }
  });
});

describe('beacons', () => {
  /** Replays the recorded loop through the objectives tracker, the way the scene does. */
  const replay = () => {
    const objectives = createObjectives(run.world.waypoints, (waypoint) => reached.push({ id: waypoint.id, at: frame }));
    const reached: { id: string; at: number }[] = [];
    let frame = 0;
    const states = run.samples.map((s, i) => {
      frame = i;
      return objectives.update(s.drone, s.state.waypoint?.id ?? null);
    });
    return { reached, states };
  };

  it('reaches every waypoint once, in order, while its phase is on', () => {
    const { reached } = replay();
    expect(reached.map((r) => r.id)).toEqual(['wp1', 'wp2', 'wp3']);
    for (const { id, at } of reached) {
      // Reached on its own phase or on the frame the mission moved on from it, not later.
      const owner = run.samples[Math.max(0, at - 1)].state.waypoint?.id;
      expect(owner).toBe(id);
    }
  });

  it('activates only the current objective and keeps reached beacons off', () => {
    const { states } = replay();
    states.forEach((map, i) => {
      const active = [...map].filter(([, state]) => state === 'active').map(([id]) => id);
      expect(active.length).toBeLessThanOrEqual(1);
      if (active.length) expect(active[0]).toBe(run.samples[i].state.waypoint?.id);
    });
    expect([...states[states.length - 1].values()]).toEqual(['reached', 'reached', 'reached']);
  });

  it('counts a waypoint by proximity and starts over on reset', () => {
    const [wp] = run.world.waypoints;
    const hits: string[] = [];
    const objectives = createObjectives(run.world.waypoints, (w) => hits.push(w.id));
    expect(objectives.update([0, 0, 50], wp.id).get(wp.id)).toBe('active');
    expect(objectives.update([wp.position[0] + REACHED_RADIUS - 0.1, 0, wp.position[2]], wp.id).get(wp.id)).toBe('reached');
    objectives.reset();
    expect(objectives.update([0, 0, 50], wp.id).get(wp.id)).toBe('active');
    expect(hits).toEqual(['wp1']);
  });
});
