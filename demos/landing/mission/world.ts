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

/**
 * Centre line of the valley the drone flies along. Straight on purpose: every leg of the mission
 * is a clean line, so each swerve on screen is caused by a force, not by the route.
 */
export function corridorX(_z: number): number {
  return 0;
}

/** Half width of the flat valley floor; the mountains rise beyond it. */
export const VALLEY_HALF_WIDTH = 22;

/**
 * Terrain height: a flat, smooth valley floor (so altitude hold has nothing to chase), rising to
 * ridged mountains on both sides, with a peak at the far end so the contours bunch like the reference.
 */
export function terrainHeight(x: number, z: number): number {
  const fromCorridor = Math.abs(x - corridorX(z));
  const valley = Math.min(1, Math.max(0, (fromCorridor - VALLEY_HALF_WIDTH) / 36));
  let ridges = 0;
  let amplitude = 1;
  let frequency = 0.035;
  for (let octave = 0; octave < 4; octave++) {
    const n = noise(x * frequency, z * frequency);
    ridges += (1 - Math.abs(n * 2 - 1)) * amplitude;
    amplitude *= 0.5;
    frequency *= 2.1;
  }
  const peak = Math.exp(-(((x + 40) ** 2) / 900 + ((z + 170) ** 2) / 1400)) * 30;
  // Fine detail only on the slopes; the floor stays smooth.
  return valley * valley * ridges * 26 + peak * valley + noise(x * 0.08, z * 0.08) * 1.2 * valley;
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
  /** Where the target waits before it is acquired. */
  targetStart: [number, number, number];
  /** The lane the target runs on when chased: parallel to the route, clear of the slalom. */
  returnLaneX: number;
}

function groundPoint(x: number, z: number, lift = 0): [number, number, number] {
  return [x, terrainHeight(x, z) + lift, z];
}

/**
 * The slalom: three pillars on the straight line from WP 1 to WP 2, each a little off-centre and
 * alternating sides, spaced so the drone is back on the line before the next one: three distinct
 * swerves, left, right, left.
 */
export const SLALOM: ReadonlyArray<{ x: number; z: number }> = [
  { x: 0.8, z: -34 },
  { x: -0.8, z: -54 },
  { x: 0.8, z: -74 },
];

export function createWorld(spireCount = 46): World {
  const random = seededRandom(42);

  const spires: Spire[] = SLALOM.map(({ x, z }) => ({ position: groundPoint(x, z), height: 13, radius: 1.6 }));
  // The rest are scenery along the valley walls, out of the drone's avoidance range.
  for (let i = spires.length; i < spireCount; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const x = side * (VALLEY_HALF_WIDTH + 6 + random() * 26);
    const z = 30 - random() * (WORLD_LENGTH + 10);
    spires.push({ position: groundPoint(x, z), height: 8 + random() * 14, radius: 1.4 + random() * 1.6 });
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
      waypointAt(-16, 'WP 1', 'wp1'),
      waypointAt(-90, 'WP 2', 'wp2'),
      waypointAt(-116, 'WP 3', 'wp3'),
    ],
    // Off to the side of the route, so the way home stays clear of the slalom.
    base: groundPoint(10, 20, 0),
    targetStart: groundPoint(6, -124, CRUISE_ALTITUDE - 1),
    returnLaneX: 14,
  };
}
