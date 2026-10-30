export type AxisBounds = {
  min: number;
  max: number;
};

export type Bounds3 = {
  x: AxisBounds;
  y: AxisBounds;
  z: AxisBounds;
};

export function mirrorVectorAcrossBounds(position: number[], bounds: Bounds3): boolean {
  const mirroredX = mirrorAxis(position, 0, bounds.x);
  const mirroredY = mirrorAxis(position, 1, bounds.y);
  const mirroredZ = mirrorAxis(position, 2, bounds.z);
  return mirroredX || mirroredY || mirroredZ;
}

function mirrorAxis(position: number[], index: number, bounds: AxisBounds): boolean {
  const size = bounds.max - bounds.min;
  if (size <= 0) return false;

  const original = position[index];
  let next = original;

  while (next < bounds.min) next += size;
  while (next > bounds.max) next -= size;

  position[index] = next;
  return next !== original;
}
