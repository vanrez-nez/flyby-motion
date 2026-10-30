import * as THREE from 'three';
import { createDrone, createTargetView, type DroneView } from './drone';
import { createForceArrows, createGoalLine, type ForceArrows } from './forceArrows';
import { createSpires, createWaypointPin, makeDotTexture, type WaypointPin } from './markers';
import type { Mission } from './missionScript';
import type { MissionPalette } from './palette';
import { addTerrainScan, createTerrain, type TerrainScan } from './terrain';
import { surfaceHeight } from './world';

/** Everything drawn in the mission scene, built once, recolored when the theme changes. */
export interface SceneObjects {
  root: THREE.Group;
  drone: DroneView;
  target: ReturnType<typeof createTargetView>;
  pins: Map<string, WaypointPin>;
  scan: TerrainScan;
  arrows: ForceArrows;
  goalLine: ReturnType<typeof createGoalLine>;
  trail: { line: THREE.Line; push(point: number[]): void; reset(): void };
  applyPalette(palette: MissionPalette): void;
  dispose(): void;
}

export interface Detail {
  /** Grid cell (m) the contours are traced on. */
  terrainCell: number;
  pointsPerSpire: number;
}

export function createSceneObjects(mission: Mission, palette: MissionPalette, detail: Detail): SceneObjects {
  const root = new THREE.Group();
  const { world } = mission;

  const terrainMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.42, fog: true });
  const terrain = createTerrain(detail.terrainCell, terrainMaterial);
  const scan = addTerrainScan(terrainMaterial, palette.line);

  const dot = makeDotTexture();
  const spireMaterial = new THREE.PointsMaterial({ size: 0.32, map: dot, transparent: true, depthWrite: false, opacity: 0.85, fog: true, sizeAttenuation: true });
  const spires = createSpires(world.spires, detail.pointsPerSpire, spireMaterial);
  root.add(terrain, scan.group, spires);

  const pins = new Map<string, WaypointPin>();
  for (const waypoint of world.waypoints) {
    const [x, , z] = waypoint.position;
    const pin = createWaypointPin(waypoint, surfaceHeight(x, z), palette.line, dot);
    pins.set(waypoint.id, pin);
    root.add(pin.group);
  }

  const drone = createDrone(mission.drone, palette.line, palette.accent);
  const target = createTargetView(mission.target, palette.accent);
  root.add(drone.group, target.group);

  const arrows = createForceArrows(mission.drone, palette);
  const goalLine = createGoalLine(palette.line);
  root.add(arrows.group, goalLine.line);

  // Trail behind the drone: a fixed-length ring buffer of recent positions.
  const TRAIL = 90;
  const trailPositions = new Float32Array(TRAIL * 3);
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  trailGeometry.setDrawRange(0, 0);
  const trailMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.4, fog: true });
  const trailLine = new THREE.Line(trailGeometry, trailMaterial);
  root.add(trailLine);
  let trailCount = 0;
  const trail = {
    line: trailLine,
    push(point: number[]) {
      // Shift by one point; small enough that a copy is cheaper than a ring index for drawing.
      trailPositions.copyWithin(3, 0, (TRAIL - 1) * 3);
      trailPositions[0] = point[0];
      trailPositions[1] = point[1];
      trailPositions[2] = point[2];
      trailCount = Math.min(TRAIL, trailCount + 1);
      trailGeometry.setDrawRange(0, trailCount);
      trailGeometry.attributes.position.needsUpdate = true;
    },
    reset() {
      trailCount = 0;
      trailGeometry.setDrawRange(0, 0);
    },
  };

  const applyPalette = (p: MissionPalette) => {
    terrainMaterial.color.copy(p.line);
    scan.setColor(p.line);
    spireMaterial.color.copy(p.line);
    trailMaterial.color.copy(p.accent);
    // Additive glow reads on dark; on light, normal blending keeps lines dark on white.
    spireMaterial.blending = p.dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    spireMaterial.needsUpdate = true;
    arrows.applyPalette(p);
    (goalLine.line.material as THREE.LineDashedMaterial).color.copy(p.line);
  };
  applyPalette(palette);

  return {
    root,
    drone,
    target,
    pins,
    scan,
    arrows,
    goalLine,
    trail,
    applyPalette,
    dispose() {
      terrain.geometry.dispose();
      spires.geometry.dispose();
      trailGeometry.dispose();
      [terrainMaterial, spireMaterial, trailMaterial].forEach((m) => m.dispose());
      dot.dispose();
      drone.dispose();
      target.dispose();
      arrows.dispose();
      goalLine.dispose();
      root.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if ((object as THREE.Sprite).isSprite) {
          (object as THREE.Sprite).material.dispose();
        } else if (mesh.isMesh || (object as THREE.Line).isLine) {
          mesh.geometry?.dispose();
          const material = mesh.material as THREE.Material | THREE.Material[];
          (Array.isArray(material) ? material : [material]).forEach((m) => m?.dispose());
        }
      });
    },
  };
}
