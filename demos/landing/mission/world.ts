import { spatial } from '../../../src/index';

/**
 * The mission world as data: terrain height, the flight corridor, obstacle spires, waypoints and
 * the base. No rendering here, so the mission logic stays testable and the scene just draws it.
 *
 * Axes: x across the valley, y up, z along it. The drone flies the corridor towards −z.
 */

export const WORLD_LENGTH = 220;
export const WORLD_HALF_WIDTH = 70;
export const CRUISE_ALTITUDE = 6;

/** Small deterministic PRNG, so the world is the same on every load. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Value noise in 2D, smooth enough for ridges. */
function makeNoise(seed: number): (x: number, z: number) => number {
  const random = seededRandom(seed);
  const size = 256;
  const table = new Float32Array(size * size);
  for (let i = 0; i < table.length; i++) table[i] = random();
  const at = (ix: number, iz: number) => table[((iz & (size - 1)) * size) + (ix & (size - 1))];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x, z) => {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = smooth(x - ix);
    const fz = smooth(z - iz);
    const a = at(ix, iz) + (at(ix + 1, iz) - at(ix, iz)) * fx;
    const b = at(ix, iz + 1) + (at(ix + 1, iz + 1) - at(ix, iz + 1)) * fx;
    return a + (b - a) * fz;
  };
}

const noise = makeNoise(7);

/** Centre line of the valley the drone flies along: a gentle S curve. */
export function corridorX(z: number): number {
  return Math.sin(z * 0.018) * 14 + Math.sin(z * 0.041 + 1.3) * 5;
}

/**
 * Terrain height: low in the corridor, rising to ridged mountains on both sides, with a peak
 * ahead of the base so the contour lines bunch like the reference.
 */
export function terrainHeight(x: number, z: number): number {
  const fromCorridor = Math.abs(x - corridorX(z));
  const valley = Math.min(1, Math.max(0, (fromCorridor - 9) / 38));
  let ridges = 0;
  let amplitude = 1;
  let frequency = 0.035;
  for (let octave = 0; octave < 4; octave++) {
    const n = noise(x * frequency, z * frequency);
    ridges += (1 - Math.abs(n * 2 - 1)) * amplitude;
    amplitude *= 0.5;
    frequency *= 2.1;
  }
  const peak = Math.exp(-(((x + 34) ** 2) / 900 + ((z + 150) ** 2) / 1400)) * 30;
  return valley * valley * ridges * 26 + peak * valley + noise(x * 0.08, z * 0.08) * 1.2;
}

export interface Spire {
  position: [number, number, number];
  height: number;
  radius: number;
}

export interface Waypoint {
  id: string;
  label: string;
  position: [number, number, number];
}

export interface World {
  spires: Spire[];
  index: spatial.Octree<Spire>;
  waypoints: Waypoint[];
  base: [number, number, number];
  /** Where the obstacle field is densest; the mission reroutes through it. */
  obstacleField: { start: number; end: number };
}

function groundPoint(x: number, z: number, lift = 0): [number, number, number] {
  return [x, terrainHeight(x, z) + lift, z];
}

export function createWorld(spireCount = 46): World {
  const random = seededRandom(42);
  const obstacleField = { start: -40, end: -95 };

  const spires: Spire[] = [];
  for (let i = 0; i < spireCount; i++) {
    // Most spires stand in the obstacle field, across the corridor; the rest line the valley.
    const inField = i < spireCount * 0.65;
    const z = inField
      ? obstacleField.start + (obstacleField.end - obstacleField.start) * random()
      : 20 - random() * (WORLD_LENGTH - 30);
    const spread = inField ? 16 : 30;
    const x = corridorX(z) + (random() * 2 - 1) * spread;
    const height = 7 + random() * (inField ? 10 : 14);
    spires.push({ position: groundPoint(x, z), height, radius: 1.4 + random() * 1.6 });
  }

  const index = new spatial.Octree<Spire>({
    x: -WORLD_HALF_WIDTH * 2, y: -20, z: -WORLD_LENGTH - 20,
    w: WORLD_HALF_WIDTH * 4, h: 120, d: WORLD_LENGTH + 60,
  });
  // Indexed by the spire's mid-height, so a query around the drone finds the ones it can hit.
  for (const spire of spires) {
    const [x, y, z] = spire.position;
    index.insert([x, y + spire.height * 0.5, z], spire);
  }

  const waypointAt = (z: number, label: string, id: string): Waypoint => {
    const x = corridorX(z);
    return { id, label, position: groundPoint(x, z, CRUISE_ALTITUDE) };
  };

  return {
    spires,
    index,
    waypoints: [
      waypointAt(-25, 'WP 1', 'wp1'),
      waypointAt(-110, 'WP 2', 'wp2'),
      waypointAt(-150, 'WP 3', 'wp3'),
    ],
    base: groundPoint(corridorX(20), 20, 0),
    obstacleField,
  };
}
