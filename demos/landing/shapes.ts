/**
 * Target formations for the landing field. Each returns `count` points (flat xyz) roughly
 * inside a radius-5 ball, centred on the origin.
 */

export interface Formation {
  name: string;
  points: Float32Array;
  /** A flat formation (the logo) reads only from the front, so the field turns to face the camera. */
  facing?: boolean;
}

const TAU = Math.PI * 2;

export function sphere(count: number, radius = 4.6): Formation {
  const points = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    points[i * 3] = Math.cos(theta) * r * radius;
    points[i * 3 + 1] = y * radius;
    points[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return { name: 'sphere', points };
}

export function torusKnot(count: number, p = 2, q = 3, scale = 1.55, tube = 0.55): Formation {
  const points = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = (i / count) * TAU;
    const r = 2 + Math.cos(q * u);
    // Centre of the tube, then a random offset around it.
    const cx = r * Math.cos(p * u);
    const cy = r * Math.sin(p * u);
    const cz = -Math.sin(q * u);
    const a = Math.random() * TAU;
    const d = Math.sqrt(Math.random()) * tube;
    points[i * 3] = (cx + Math.cos(a) * d) * scale;
    points[i * 3 + 1] = (cy + Math.sin(a) * d) * scale;
    points[i * 3 + 2] = (cz + Math.cos(a + 1.3) * d) * scale;
  }
  return { name: 'torus knot', points };
}

export function galaxy(count: number, arms = 3, radius = 5.6): Formation {
  const points = new Float32Array(count * 3);
  const tilt = 0.55;
  for (let i = 0; i < count; i++) {
    const t = Math.pow(Math.random(), 0.7);
    const arm = (i % arms) / arms * TAU;
    const angle = arm + t * 3.6;
    const spread = (1 - t) * 0.9 + 0.15;
    const x = Math.cos(angle) * t * radius + (Math.random() - 0.5) * spread;
    const z = Math.sin(angle) * t * radius + (Math.random() - 0.5) * spread;
    const y = (Math.random() - 0.5) * spread * 0.6;
    // Tilt the disc towards the camera.
    points[i * 3] = x;
    points[i * 3 + 1] = y * Math.cos(tilt) - z * Math.sin(tilt);
    points[i * 3 + 2] = y * Math.sin(tilt) + z * Math.cos(tilt);
  }
  return { name: 'galaxy', points };
}

/**
 * Samples the opaque pixels of an image (the flyby logo) into a flat formation.
 * Resolves to null when the image cannot be loaded or read.
 */
export function imageFormation(url: string, count: number, width = 10.5, name = 'flyby'): Promise<Formation | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      try {
        const scale = 2;
        const w = Math.max(1, Math.round((image.naturalWidth || 449) * scale));
        const h = Math.max(1, Math.round((image.naturalHeight || 142) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(image, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        const opaque: number[] = [];
        for (let y = 0; y < h; y += 2) {
          for (let x = 0; x < w; x += 2) {
            if (data[(y * w + x) * 4 + 3] > 128) opaque.push(x, y);
          }
        }
        if (opaque.length === 0) return resolve(null);

        const unit = width / w;
        const points = new Float32Array(count * 3);
        const pixels = opaque.length / 2;
        for (let i = 0; i < count; i++) {
          const j = Math.floor(Math.random() * pixels) * 2;
          points[i * 3] = (opaque[j] - w / 2) * unit;
          points[i * 3 + 1] = (h / 2 - opaque[j + 1]) * unit;
          points[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
        }
        resolve({ name, points, facing: true });
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
}
