import * as THREE from 'three';
import type { HudAnchors, HudSnapshot } from './hudState';
import type { Mission, MissionState } from './missionScript';
import { terrainHeight } from './world';

/** Builds the HUD snapshot from the mission (throttled) and projects the HUD anchors (every frame). */
export function createHudPublisher(mission: Mission, camera: THREE.Camera, container: HTMLElement, onSnapshot: (snapshot: HudSnapshot) => void) {
  const projected = new THREE.Vector3();
  let lastPublish = -Infinity;

  const project = (point: number[], out: { x: number; y: number; visible: boolean }) => {
    projected.set(point[0], point[1], point[2]).project(camera);
    out.visible = projected.z < 1 && Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1;
    out.x = (projected.x * 0.5 + 0.5) * container.clientWidth;
    out.y = (-projected.y * 0.5 + 0.5) * container.clientHeight;
  };

  return {
    projectAnchors(anchors: HudAnchors, targetShown: boolean) {
      project(mission.drone.position, anchors.drone);
      project(mission.target.position, anchors.target);
      anchors.target.visible = anchors.target.visible && targetShown;
    },
    publish(state: MissionState, t: number, force = false) {
      if (!force && t - lastPublish < 0.1) return;
      lastPublish = t;
      const { drone, target } = mission;
      const [vx, vy, vz] = drone.velocity;
      const [x, y, z] = drone.position;
      onSnapshot({
        phaseIndex: state.phaseIndex,
        phaseCount: state.phaseCount,
        phaseCode: state.phaseCode,
        phaseTitle: state.phaseTitle,
        missionTime: state.missionTime,
        forces: state.activeForces.map((f) => ({ label: f.label, recipe: f.recipe, kind: f.kind, level: Math.min(1, f.magnitude / drone.maxForce) })),
        speed: Math.hypot(vx, vy, vz),
        altitude: y - terrainHeight(x, z),
        heading: (THREE.MathUtils.radToDeg(Math.atan2(vx, -vz)) + 360) % 360,
        thrust: Math.min(1, state.activeForces.reduce((s, f) => s + f.magnitude, 0) / drone.maxForce),
        targetDistance: state.targetVisible
          ? Math.hypot(x - target.position[0], y - target.position[1], z - target.position[2])
          : null,
        targetLocked: state.targetLocked,
        waypoint: state.waypoint?.label ?? null,
      });
    },
  };
}
