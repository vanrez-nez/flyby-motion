import * as THREE from 'three';
import { terrainHeight, WORLD_HALF_WIDTH, WORLD_LENGTH } from './world';

/**
 * The contour-line terrain (reference: docs/ideas/drone-hud-reference-terrain.png): rows of
 * horizontal lines sampled from the height field. Lines bunch on the slopes and spread in the
 * valleys, like the stacked contours of the reference. One draw call, `LineSegments`.
 */
export function createTerrain(rows: number, samples: number, material: THREE.LineBasicMaterial): THREE.LineSegments {
  const zStart = 30;
  const zEnd = -WORLD_LENGTH - 10;
  const xSpan = WORLD_HALF_WIDTH;
  const positions: number[] = [];
  const colors: number[] = [];

  for (let r = 0; r < rows; r++) {
    const z = zStart + (zEnd - zStart) * (r / (rows - 1));
    let prev: [number, number, number] | null = null;
    for (let s = 0; s <= samples; s++) {
      const x = -xSpan + (2 * xSpan) * (s / samples);
      const y = terrainHeight(x, z);
      const point: [number, number, number] = [x, y, z];
      if (prev) {
        positions.push(...prev, ...point);
        // Brighter on high ground, so ridges read like the reference's lit contours.
        const shade = (h: number) => 0.25 + Math.min(1, h / 28) * 0.75;
        colors.push(shade(prev[1]), shade(prev[1]), shade(prev[1]), shade(y), shade(y), shade(y));
      }
      prev = point;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.LineSegments(geometry, material);
}

/** The perspective ground grid under the terrain, fading with the fog. */
export function createGrid(material: THREE.LineBasicMaterial): THREE.LineSegments {
  const positions: number[] = [];
  const step = 10;
  const y = -0.5;
  for (let x = -WORLD_HALF_WIDTH; x <= WORLD_HALF_WIDTH; x += step) {
    positions.push(x, y, 30, x, y, -WORLD_LENGTH - 10);
  }
  for (let z = 30; z >= -WORLD_LENGTH - 10; z -= step) {
    positions.push(-WORLD_HALF_WIDTH, y, z, WORLD_HALF_WIDTH, y, z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.LineSegments(geometry, material);
}
