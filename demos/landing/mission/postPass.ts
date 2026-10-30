import * as THREE from 'three';

/**
 * The scene's camera look, in one full-screen pass over the rendered frame: the view through an
 * optic, sharp in the middle and softening toward the rim with a colour fringe, the vignette that
 * fades the box into the page, and the glitch tears on mission events.
 *
 * Built to stay cheap on phones: one extra pass, three texture reads per pixel. The defocus reads
 * the frame's mipmaps (blurrier levels toward the edges) instead of running a blur kernel, so its
 * cost doesn't grow with the blur.
 */

export interface PostPass {
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  /** Matches the target to the canvas; call after `renderer.setSize`. */
  resize(): void;
  setCompact(compact: boolean): void;
  /** A tear: slices jump sideways and the channels split for `duration` ms. `intensity` ~1. */
  glitch(intensity: number, duration: number): void;
  update(dt: number): void;
  dispose(): void;
}

interface Look {
  /** Vignette fade widths as a fraction of the box: left, right, bottom, top. */
  vignette: [number, number, number, number];
  /** Colour fringe at the corners, in drawing-buffer pixels. */
  aberration: number;
  /** Mip level reached at the corners: about 2^level pixels of blur. */
  defocus: number;
}

// Desktop: the box bleeds under the hero and past the window, so its sides fade wide. Phones:
// full width, so only a light fade at the sides.
const LOOK: Record<'wide' | 'compact', Look> = {
  wide: { vignette: [0.22, 0.2, 0.2, 0.18], aberration: 8, defocus: 3 },
  compact: { vignette: [0.08, 0.08, 0.16, 0.14], aberration: 5, defocus: 2.2 },
};

/** Glitch frames: a new tear pattern every ~60 ms, like the stepped keyframes it replaces. */
const GLITCH_STEP = 0.06;

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D tScene;
uniform vec2 uResolution;
uniform vec4 uVignette;
uniform float uAberration;
uniform float uDefocus;
uniform float uGlitch;
uniform float uSeed;
varying vec2 vUv;

float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  vec2 uv = vUv;

  // Glitch: the frame tears into horizontal slices; some jump sideways with their channels split.
  float torn = 0.0;
  if (uGlitch > 0.0) {
    float rows = 14.0 + floor(hash(uSeed) * 20.0);
    float row = floor(uv.y * rows);
    torn = step(1.0 - uGlitch * 0.35, hash(row * 13.17 + uSeed * 7.31));
    uv.x += torn * (hash(row * 3.7 + uSeed) - 0.5) * 0.025 * uGlitch;
  }

  // Lens: distance from the optical centre, aspect-corrected so the falloff is round.
  vec2 centered = uv - 0.5;
  float r = length(centered * vec2(uResolution.x / uResolution.y, 1.0));
  float rim = smoothstep(0.12, 0.75, r);
  float lod = rim * uDefocus;
  vec2 radial = centered / max(length(centered), 1e-4);
  vec2 shift = (radial * rim * rim * uAberration + vec2(torn * uGlitch * 4.0, 0.0)) / uResolution;

  // The frame is premultiplied; each channel keeps the alpha of the read it came from, so the
  // fringe can spill past a line's edge without going brighter than the line itself.
  vec4 base = textureLod(tScene, uv, lod);
  vec4 red = textureLod(tScene, uv + shift, lod);
  vec4 blue = textureLod(tScene, uv - shift, lod);
  vec4 color = vec4(red.r, base.g, blue.b, max(base.a, max(red.a, blue.a)));
  color *= 1.0 - torn * 0.18;

  // Vignette: two fades multiplied, so all four sides fade evenly and the corners stay soft.
  float fx = smoothstep(0.0, uVignette.x, vUv.x) * smoothstep(0.0, uVignette.y, 1.0 - vUv.x);
  float fy = smoothstep(0.0, uVignette.z, vUv.y) * smoothstep(0.0, uVignette.w, 1.0 - vUv.y);
  gl_FragColor = color * fx * fy;
}`;

export function createPostPass(renderer: THREE.WebGLRenderer, compact: boolean, antialias: boolean): PostPass {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    samples: antialias ? 4 : 0,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
  });
  // Render the scene into the target exactly as it would draw on the canvas: colours written
  // sRGB-encoded and blended in that space (three writes linear into plain render targets, which
  // would brighten every translucent line). The XR flag makes three encode for the texture's
  // colour space, and the plain RGBA8 storage keeps the values as written; the pass then outputs
  // them untouched.
  target.texture.colorSpace = THREE.SRGBColorSpace;
  target.texture.internalFormat = 'RGBA8';
  (target as THREE.WebGLRenderTarget & { isXRRenderTarget: boolean }).isXRRenderTarget = true;

  const uniforms = {
    tScene: { value: target.texture },
    uResolution: { value: size.clone() },
    uVignette: { value: new THREE.Vector4() },
    uAberration: { value: 0 },
    uDefocus: { value: 0 },
    uGlitch: { value: 0 },
    uSeed: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
  });

  // One triangle covering the screen.
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const quad = new THREE.Mesh(geometry, material);
  quad.frustumCulled = false;
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  const quadCamera = new THREE.Camera();

  const setCompact = (isCompact: boolean) => {
    const look = LOOK[isCompact ? 'compact' : 'wide'];
    uniforms.uVignette.value.set(...look.vignette);
    uniforms.uAberration.value = look.aberration;
    uniforms.uDefocus.value = look.defocus;
  };
  setCompact(compact);

  let time = 0;
  let glitchUntil = 0;
  let glitchIntensity = 0;
  let lastStep = -1;

  return {
    render(scene, camera) {
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(quadScene, quadCamera);
    },
    resize() {
      renderer.getDrawingBufferSize(size);
      target.setSize(size.x, size.y);
      uniforms.uResolution.value.copy(size);
    },
    setCompact,
    glitch(intensity, duration) {
      glitchIntensity = intensity;
      glitchUntil = time + duration / 1000;
      lastStep = -1;
    },
    update(dt) {
      time += dt;
      if (time >= glitchUntil) {
        uniforms.uGlitch.value = 0;
        return;
      }
      const step = Math.floor(time / GLITCH_STEP);
      if (step === lastStep) return;
      lastStep = step;
      // Each step is a new tear, and about one in four is clean, so the burst flickers.
      uniforms.uSeed.value = step % 997;
      uniforms.uGlitch.value = Math.random() < 0.25 ? 0 : glitchIntensity * (0.6 + Math.random() * 0.4);
    },
    dispose() {
      target.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
