import * as THREE from 'three';
import type { Particle } from './fieldParticles';

/** The glowing point cloud that draws the particles, colored by speed (violet → pink → cyan). */

const palette = {
  calm: new THREE.Color('#8b7cff'),
  mid: new THREE.Color('#ff4fd8'),
  fast: new THREE.Color('#4fc3ff'),
};

export function isDarkScheme(): boolean {
  const theme = document.documentElement.dataset.theme;
  if (theme === 'light' || theme === 'dark') return theme === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function makeSpriteTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface ParticleCloud {
  points: THREE.Points;
  /** Additive glow on dark, normal blending on light; `dim` fades it behind text. */
  setAppearance(dim: boolean): void;
  update(particles: Particle[]): void;
  dispose(): void;
}

export function createParticleCloud(count: number): ParticleCloud {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const texture = makeSpriteTexture();
  const material = new THREE.PointsMaterial({
    size: 0.2,
    map: texture,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  const color = new THREE.Color();

  return {
    points,
    setAppearance(dim) {
      const dark = isDarkScheme();
      material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      material.opacity = (dark ? 0.95 : 0.8) * (dim ? 0.5 : 1);
      material.needsUpdate = true;
    },
    update(particles) {
      for (let i = 0; i < particles.length; i++) {
        const { agent } = particles[i];
        const p = agent.position;
        positions[i * 3] = p[0];
        positions[i * 3 + 1] = p[1];
        positions[i * 3 + 2] = p[2];

        const v = agent.velocity;
        const speed = Math.min(1, Math.hypot(v[0], v[1], v[2]) / agent.maxSpeed);
        if (speed < 0.5) color.copy(palette.calm).lerp(palette.mid, speed * 2);
        else color.copy(palette.mid).lerp(palette.fast, (speed - 0.5) * 2);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
