import * as THREE from 'three';
import { Vector3Fn } from '../../../../src/index';

import { demoColors as colors, type DemoColorRole } from './colors';
export { colors };

export type RadiusIndicator = {
  group: THREE.Group;
  material: THREE.ShaderMaterial;
};

/**
 * Marks what a material (or arrow) shows, so `applyDemoPalette` can recolor it when the theme
 * changes; with `emissive`, its glow follows the same role.
 */
export function tagColor<T extends THREE.Material | THREE.ArrowHelper>(target: T, role: DemoColorRole, emissive = false): T {
  target.userData.colorRole = role;
  if (emissive) target.userData.emissiveRole = role;
  return target;
}

/** Recolors the scene from `demoColors`: the clear color, the fog and everything tagged. */
export function applyDemoPalette(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
  renderer.setClearColor(colors.bg);
  if (scene.fog instanceof THREE.Fog) scene.fog.color.setHex(colors.bg);
  scene.traverse((object) => {
    if (object instanceof THREE.ArrowHelper) {
      const role = object.userData.colorRole as DemoColorRole | undefined;
      if (role) object.setColor(colors[role]);
      return;
    }
    const material = (object as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    for (const entry of Array.isArray(material) ? material : material ? [material] : []) {
      const { colorRole, emissiveRole } = entry.userData as { colorRole?: DemoColorRole; emissiveRole?: DemoColorRole };
      if (colorRole && 'color' in entry) (entry.color as THREE.Color).setHex(colors[colorRole]);
      if (emissiveRole && 'emissive' in entry) (entry.emissive as THREE.Color).setHex(colors[emissiveRole]);
    }
  });
}

export function createAgentMesh(_index: number): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.16, 24, 16);
  const material = tagColor(new THREE.MeshStandardMaterial({
    color: colors.agent,
    roughness: 0.42,
    metalness: 0.05,
    emissive: 0x07120f,
  }), 'agent');
  return new THREE.Mesh(geometry, material);
}

export function createMarker(role: DemoColorRole): THREE.Group {
  const color = colors[role];
  const group = new THREE.Group();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 24, 16),
    tagColor(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 }), role, true),
  );
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.015, 8, 48),
    tagColor(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }), role),
  );
  ring.rotation.x = Math.PI / 2;
  group.add(sphere, ring);
  return group;
}

export function createTrail(): THREE.Line {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
  const material = tagColor(new THREE.LineBasicMaterial({
    color: colors.trail,
    transparent: true,
    opacity: 0.45,
  }), 'trail');
  return new THREE.Line(geometry, material);
}

export function addTrailPoint(
  positions: number[],
  point: number[],
  maxPoints: number,
  minSpacing = 0.08,
): void {
  const lastIndex = positions.length - 3;
  const last = lastIndex >= 0
    ? [positions[lastIndex], positions[lastIndex + 1], positions[lastIndex + 2]]
    : undefined;

  if (!last || Vector3Fn.distance(last, point) > minSpacing) {
    positions.push(point[0], point[1], point[2]);
    while (positions.length > maxPoints * 3) positions.splice(0, 3);
  }
}

export function updateTrail(line: THREE.Line, positions: number[]): void {
  line.geometry.dispose();
  line.geometry = new THREE.BufferGeometry();
  line.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
}

export function createRadiusIndicator(): RadiusIndicator {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(1, 96, 48);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(colors.target) },
      uNearAlpha: { value: 0.015 },
      uFarAlpha: { value: 0.12 },
      uEdgeAlpha: { value: 0.45 },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPosition;

      void main() {
        vNormalView = normalize(normalMatrix * normal);
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = viewPosition.xyz;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uNearAlpha;
      uniform float uFarAlpha;
      uniform float uEdgeAlpha;
      varying vec3 vNormalView;
      varying vec3 vViewPosition;

      void main() {
        // View direction from this surface point toward the camera (origin in view space).
        // Using the per-fragment view direction makes the silhouette align with the sphere
        // under perspective; using the constant camera forward axis (normal.z) does not.
        vec3 viewDir = normalize(-vViewPosition);
        float facing = dot(normalize(vNormalView), viewDir);
        float nearSide = smoothstep(0.0, 1.0, facing);
        float farSide = smoothstep(0.0, 1.0, -facing);
        float grazing = 1.0 - abs(facing);
        float rim = pow(clamp(grazing, 0.0, 1.0), 2.4);
        float fillAlpha = nearSide * uNearAlpha + farSide * uFarAlpha;
        vec3 rimColor = mix(uColor, vec3(1.0), 0.55);
        vec3 color = mix(uColor, rimColor, rim);
        gl_FragColor = vec4(color, fillAlpha + rim * uEdgeAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
  });
  group.add(new THREE.Mesh(geometry, material));
  return { group, material };
}

export function updateRadiusIndicator(
  indicator: RadiusIndicator,
  point: number[],
  radius: number,
  color: number,
  cameraDistance: number,
): void {
  indicator.group.position.set(point[0], point[1], point[2]);
  indicator.group.scale.setScalar(radius);
  const alphaT = THREE.MathUtils.smoothstep(cameraDistance, radius * 1.2, radius * 4);
  indicator.material.uniforms.uColor.value.setHex(color);
  indicator.material.uniforms.uNearAlpha.value = THREE.MathUtils.lerp(0.004, 0.012, alphaT);
  indicator.material.uniforms.uFarAlpha.value = THREE.MathUtils.lerp(0.02, 0.06, alphaT);
  indicator.material.uniforms.uEdgeAlpha.value = THREE.MathUtils.lerp(0.45, 0.95, alphaT);
}

export function updateArrow(
  arrow: THREE.ArrowHelper,
  origin: number[],
  vector: number[],
  scale: number,
  maxLength: number,
): void {
  const v = new THREE.Vector3(vector[0], vector[1], vector[2]);
  const len = v.length();
  arrow.position.set(origin[0], origin[1], origin[2]);

  if (len < 0.001) {
    arrow.visible = false;
    return;
  }

  arrow.visible = true;
  v.normalize();
  arrow.setDirection(v);
  arrow.setLength(Math.min(len * scale, maxLength), 0.16, 0.08);
}
