import * as THREE from 'three';
import { seededRandom, type Spire, type Waypoint } from './world';

/**
 * World markers in the style of docs/ideas/drone-hud-reference-map.png: point-cloud spires, pins
 * with a flag and ground rings for waypoints, and framed text panels floating in the scene.
 */

/** Soft round dot, so points read as glowing particles instead of squares. */
export function makeDotTexture(): THREE.Texture {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** All spires as one point cloud: points scattered in a tapering column, denser at the base. */
export function createSpires(spires: Spire[], pointsPerSpire: number, material: THREE.PointsMaterial): THREE.Points {
  const random = seededRandom(9);
  const positions = new Float32Array(spires.length * pointsPerSpire * 3);
  let i = 0;
  for (const spire of spires) {
    const [x, y, z] = spire.position;
    for (let p = 0; p < pointsPerSpire; p++) {
      const t = Math.pow(random(), 0.8);
      const radius = spire.radius * (1 - t * 0.85) * Math.sqrt(random());
      const angle = random() * Math.PI * 2;
      positions[i++] = x + Math.cos(angle) * radius;
      positions[i++] = y + t * spire.height;
      positions[i++] = z + Math.sin(angle) * radius;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(geometry, material);
}

export interface WaypointPin {
  group: THREE.Group;
  rings: THREE.Mesh[];
  setActive(active: boolean): void;
}

/** A pin: vertical stick, a small flag, and two rings on the ground. */
export function createWaypointPin(waypoint: Waypoint, groundY: number, color: THREE.Color): WaypointPin {
  const group = new THREE.Group();
  const [x, y, z] = waypoint.position;
  group.position.set(x, groundY, z);

  const lineMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8, fog: true });
  const stick = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, y - groundY + 2, 0)]);
  group.add(new THREE.Line(stick, lineMaterial));

  const flagShape = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, y - groundY + 2, 0),
    new THREE.Vector3(1.4, y - groundY + 1.5, 0),
    new THREE.Vector3(0, y - groundY + 1, 0),
  ]);
  group.add(new THREE.LineLoop(flagShape, lineMaterial));

  const rings: THREE.Mesh[] = [];
  for (const [inner, outer] of [[0.9, 1.05], [1.9, 2.0]]) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, fog: true }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);
    rings.push(ring);
  }

  return {
    group,
    rings,
    setActive(active) {
      lineMaterial.opacity = active ? 1 : 0.45;
      group.scale.setScalar(active ? 1.15 : 1);
    },
  };
}

export interface ScenePanel {
  sprite: THREE.Sprite;
  show(text: string, at: THREE.Vector3, tone: 'info' | 'lock' | 'warn'): void;
  update(dt: number): void;
  dispose(): void;
}

/**
 * A framed text panel that floats in the scene (the reference's tilted "HAVE NICE DAY!" label):
 * drawn on a canvas once per message, shown on a sprite that faces the camera, fading out.
 */
export function createScenePanel(fontFamily: string, colors: Record<'info' | 'lock' | 'warn', string>): ScenePanel {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // `sizeAttenuation: false`: the panel keeps one size on screen however close the camera is to
  // its anchor (an attenuated sprite near the chase camera filled the whole view).
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false, opacity: 0, sizeAttenuation: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.24, 0.06, 1);
  sprite.center.set(0, 0.5); // grows to the right of its anchor, like a callout
  sprite.renderOrder = 10;
  let life = 0;

  return {
    sprite,
    show(text, at, tone) {
      const color = colors[tone];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      // Frame with clipped corners.
      const m = 6, c = 18, w = canvas.width - m * 2, h = canvas.height - m * 2;
      ctx.beginPath();
      ctx.moveTo(m + c, m); ctx.lineTo(m + w, m); ctx.lineTo(m + w, m + h - c);
      ctx.lineTo(m + w - c, m + h); ctx.lineTo(m, m + h); ctx.lineTo(m, m + c); ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = `500 48px ${fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, m + 28, canvas.height / 2 + 2, w - 48);
      texture.needsUpdate = true;
      sprite.position.copy(at);
      life = 3.2;
    },
    update(dt) {
      life = Math.max(0, life - dt);
      material.opacity = Math.min(1, life / 0.6) * 0.95;
      sprite.visible = life > 0;
    },
    dispose() {
      texture.dispose();
      material.dispose();
    },
  };
}
