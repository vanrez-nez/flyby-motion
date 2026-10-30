import * as THREE from 'three';
import { surfaceHeight, WORLD_HALF_WIDTH, WORLD_LENGTH } from './world';

/**
 * The contour-line terrain: true iso-height lines traced with marching squares over the surface,
 * like a topographic map seen in perspective. Lines bunch on the slopes and in the sinkhole and
 * spread on the floor. One draw call, `LineSegments`.
 */

/**
 * Contours are spaced on a compressed height, so the floor gets a line every 35 cm while the
 * mountains, ~50 m tall, get a few metres between lines instead of a solid white wall.
 */
const CONTOUR_STEP = 0.35;
const levelOf = (h: number) => (h <= 0 ? h : 6 * Math.log1p(h / 6));
/** Every Nth contour is an index line, drawn brighter, as on a survey map. */
const INDEX_EVERY = 5;

export function createTerrain(cell: number, material: THREE.LineBasicMaterial): THREE.LineSegments {
  const x0 = -WORLD_HALF_WIDTH;
  const z0 = -WORLD_LENGTH - 10;
  const columns = Math.ceil((2 * WORLD_HALF_WIDTH) / cell);
  const rows = Math.ceil((30 - z0) / cell);

  // Sample the surface once on the grid: compressed level for tracing, real height for placing.
  const level = new Float32Array((columns + 1) * (rows + 1));
  const height = new Float32Array(level.length);
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= columns; c++) {
      const h = surfaceHeight(x0 + c * cell, z0 + r * cell);
      height[r * (columns + 1) + c] = h;
      level[r * (columns + 1) + c] = levelOf(h);
    }
  }

  const positions: number[] = [];
  const colors: number[] = [];
  // Brighter on high ground, so ridges read lit; index lines brighter still.
  const shade = (h: number, index: boolean) => Math.min(1, 0.3 + Math.min(1, h / 28) * 0.6 + (index ? 0.3 : 0));

  // Where the contour at `iso` crosses the edge between grid points a and b.
  const cross = (a: number, b: number, iso: number, out: number[]) => {
    const t = (iso - level[a]) / (level[b] - level[a]);
    const ac = a % (columns + 1);
    const ar = (a - ac) / (columns + 1);
    const bc = b % (columns + 1);
    const br = (b - bc) / (columns + 1);
    out.push(
      x0 + (ac + (bc - ac) * t) * cell,
      height[a] + (height[b] - height[a]) * t,
      z0 + (ar + (br - ar) * t) * cell,
    );
  };

  const point: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      // Corners, counter-clockwise from bottom-left; edges 0..3 are bottom, right, top, left.
      const bl = r * (columns + 1) + c;
      const br = bl + 1;
      const tr = br + columns + 1;
      const tl = bl + columns + 1;
      const edges: [number, number][] = [[bl, br], [br, tr], [tr, tl], [tl, bl]];
      const lo = Math.min(level[bl], level[br], level[tr], level[tl]);
      const hi = Math.max(level[bl], level[br], level[tr], level[tl]);
      for (let k = Math.ceil(lo / CONTOUR_STEP); k * CONTOUR_STEP < hi; k++) {
        const iso = k * CONTOUR_STEP;
        // Crossed edges come in pairs; a saddle (four crossings) pairs them in order.
        point.length = 0;
        for (const [a, b] of edges) {
          if ((level[a] < iso) !== (level[b] < iso)) cross(a, b, iso, point);
        }
        const g = shade(height[bl], k % INDEX_EVERY === 0);
        for (let p = 0; p + 5 < point.length; p += 6) {
          positions.push(point[p], point[p + 1], point[p + 2], point[p + 3], point[p + 4], point[p + 5]);
          colors.push(g, g, g, g, g, g);
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.LineSegments(geometry, material);
}

const SCANS = 4;
/** Ground speed of the scan front, m/s, and how long it stays visible. */
const SCAN_SPEED = 16;
const SCAN_LIFE = 3.8;
/** Radius around a reached beacon that stays brighter for the rest of the loop: mapped ground. */
const REVEAL_RADIUS = 26;
/** Points on each front ring, laid on the surface every frame so it rides over the terrain. */
const RING_POINTS = 160;

export interface TerrainScan {
  /** The front rings; add to the scene. */
  group: THREE.Group;
  /** Starts a scan wave across the terrain from (x, z), after `delay` seconds. */
  trigger(x: number, z: number, delay?: number): void;
  update(dt: number): void;
  /** Jumps every scan to its end: only the revealed ground is left (for the reduced-motion still). */
  settle(): void;
  setColor(color: THREE.Color): void;
  reset(): void;
}

/**
 * Scan waves: a bright front that rings out across the terrain from a point, then leaves the
 * ground it crossed near the source lit, as if just mapped. The front is a ring line laid on the
 * surface, so it reads as a sweep even where contours are sparse; the contours it crosses light up
 * in the line material's shader (patched in, so fog and vertex colors stay).
 */
export function addTerrainScan(material: THREE.LineBasicMaterial, color: THREE.Color): TerrainScan {
  const uniforms = {
    uScanCenter: { value: Array.from({ length: SCANS }, () => new THREE.Vector2()) },
    uScanAge: { value: new Array<number>(SCANS).fill(-1) },
    uScanColor: { value: color.clone() },
  };
  const ages = new Array<number>(SCANS).fill(-1);
  const active = new Array<boolean>(SCANS).fill(false);
  let next = 0;

  const group = new THREE.Group();
  const rings = Array.from({ length: SCANS }, () => {
    const positions = new Float32Array(RING_POINTS * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const ringMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, fog: true });
    const line = new THREE.LineLoop(geometry, ringMaterial);
    line.visible = false;
    line.frustumCulled = false;
    group.add(line);
    return { line, positions, material: ringMaterial };
  });

  const drawRing = (i: number) => {
    const { line, positions, material: ringMaterial } = rings[i];
    const age = ages[i];
    line.visible = active[i] && age >= 0 && age < SCAN_LIFE;
    if (!line.visible) return;
    const radius = age * SCAN_SPEED;
    const { x: cx, y: cz } = uniforms.uScanCenter.value[i];
    for (let p = 0; p < RING_POINTS; p++) {
      const angle = (p / RING_POINTS) * Math.PI * 2;
      const x = cx + Math.cos(angle) * radius;
      const z = cz + Math.sin(angle) * radius;
      positions[p * 3] = x;
      positions[p * 3 + 1] = surfaceHeight(x, z) + 0.08;
      positions[p * 3 + 2] = z;
    }
    line.geometry.attributes.position.needsUpdate = true;
    // Fades in over the first metres, out over the second half of its life.
    const fade = 1 - THREE.MathUtils.smoothstep(age, SCAN_LIFE * 0.45, SCAN_LIFE);
    ringMaterial.opacity = Math.min(1, age * 4) * fade * 0.9;
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vScanXZ;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvScanXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec2 vScanXZ;
uniform vec2 uScanCenter[${SCANS}];
uniform float uScanAge[${SCANS}];
uniform vec3 uScanColor;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float scanFront = 0.0;
float scanLit = 0.0;
for (int i = 0; i < ${SCANS}; i++) {
  float age = uScanAge[i];
  if (age < 0.0) continue;
  float radius = age * ${SCAN_SPEED.toFixed(1)};
  float d = distance(vScanXZ, uScanCenter[i]);
  float fade = 1.0 - smoothstep(${(SCAN_LIFE * 0.45).toFixed(2)}, ${SCAN_LIFE.toFixed(2)}, age);
  // The front: a sharp leading edge with a short trail behind it.
  float ahead = d - radius;
  float front = ahead > 0.0 ? exp(-ahead * ahead / 1.5) : exp(ahead / 9.0);
  scanFront = max(scanFront, front * fade);
  // Ground the front has crossed, near the beacon, stays lit.
  scanLit = max(scanLit, step(d, radius) * (1.0 - smoothstep(${(REVEAL_RADIUS * 0.4).toFixed(1)}, ${REVEAL_RADIUS.toFixed(1)}, d)));
}
diffuseColor.rgb = mix(diffuseColor.rgb, uScanColor, scanFront);
diffuseColor.a = min(1.0, diffuseColor.a * (1.0 + scanLit * 0.8 + scanFront * 3.0));`);
  };

  const upload = () => {
    for (let i = 0; i < SCANS; i++) uniforms.uScanAge.value[i] = active[i] ? Math.max(ages[i], -1) : -1;
  };

  return {
    group,
    trigger(x, z, delay = 0) {
      uniforms.uScanCenter.value[next].set(x, z);
      ages[next] = -delay;
      active[next] = true;
      next = (next + 1) % SCANS;
      upload();
    },
    update(dt) {
      for (let i = 0; i < SCANS; i++) {
        if (active[i]) ages[i] += dt;
        drawRing(i);
      }
      upload();
    },
    settle() {
      for (let i = 0; i < SCANS; i++) {
        if (active[i]) ages[i] = Math.max(ages[i], SCAN_LIFE);
        drawRing(i);
      }
      upload();
    },
    setColor(c) {
      uniforms.uScanColor.value.copy(c);
      rings.forEach((ring) => ring.material.color.copy(c));
    },
    reset() {
      active.fill(false);
      next = 0;
      rings.forEach(({ line }) => { line.visible = false; });
      upload();
    },
  };
}
