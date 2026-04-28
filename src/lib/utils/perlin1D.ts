const PERLIN_PERMUTATION = createPerlinPermutation();

function createPerlinPermutation(): number[] {
  const permutation = Array.from({ length: 256 }, (_, i) => i);
  let seed = 0xdecafbad;

  for (let i = permutation.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
  }

  return permutation.concat(permutation);
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number): number {
  return (hash & 1) === 0 ? x : -x;
}

export function perlin1D(x: number): number {
  const X = Math.floor(x) & 255;
  const localX = x - Math.floor(x);
  const u = fade(localX);
  const a = PERLIN_PERMUTATION[X];
  const b = PERLIN_PERMUTATION[X + 1];
  return lerp(grad(a, localX), grad(b, localX - 1), u) * 2;
}
