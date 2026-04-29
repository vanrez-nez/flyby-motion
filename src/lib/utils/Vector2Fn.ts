/**
 * Copy the values from one vec2 to another
 */
export function copy(out: number[], a: number[]): number[] {
    out[0] = a[0];
    out[1] = a[1];
    return out;
}

/**
 * Set the components of a vec2 to the given values
 */
export function set(out: number[], x: number, y: number): number[] {
    out[0] = x;
    out[1] = y;
    return out;
}

/**
 * Adds two vec2's
 */
export function add(out: number[], a: number[], b: number[]): number[] {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    return out;
}

/**
 * Subtracts vector b from vector a
 */
export function subtract(out: number[], a: number[], b: number[]): number[] {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    return out;
}

/**
 * Multiplies two vec2's
 */
export function multiply(out: number[], a: number[], b: number[]): number[] {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    return out;
}

/**
 * Divides two vec2's
 */
export function divide(out: number[], a: number[], b: number[]): number[] {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    return out;
}

/**
 * Scales a vec2 by a scalar number
 */
export function scale(out: number[], a: number[], b: number): number[] {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    return out;
}

/**
 * Calculates the euclidian distance between two vec2's
 */
export function distance(a: number[], b: number[]): number {
    const x = b[0] - a[0];
    const y = b[1] - a[1];
    return Math.sqrt(x * x + y * y);
}

/**
 * Calculates the squared euclidian distance between two vec2's
 */
export function squaredDistance(a: number[], b: number[]): number {
    const x = b[0] - a[0];
    const y = b[1] - a[1];
    return x * x + y * y;
}

/**
 * Calculates the length of a vec2
 */
export function length(a: number[]): number {
    const x = a[0];
    const y = a[1];
    return Math.sqrt(x * x + y * y);
}

/**
 * Calculates the squared length of a vec2
 */
export function squaredLength(a: number[]): number {
    const x = a[0];
    const y = a[1];
    return x * x + y * y;
}

/**
 * Negates the components of a vec2
 */
export function negate(out: number[], a: number[]): number[] {
    out[0] = -a[0];
    out[1] = -a[1];
    return out;
}

/**
 * Returns the inverse of the components of a vec2
 */
export function inverse(out: number[], a: number[]): number[] {
    out[0] = 1.0 / a[0];
    out[1] = 1.0 / a[1];
    return out;
}

/**
 * Normalize a vec2
 */
export function normalize(out: number[], a: number[]): number[] {
    const x = a[0];
    const y = a[1];
    let len = x * x + y * y;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
    }
    out[0] = a[0] * len;
    out[1] = a[1] * len;
    return out;
}

/**
 * Calculates the dot product of two vec2's
 */
export function dot(a: number[], b: number[]): number {
    return a[0] * b[0] + a[1] * b[1];
}

/**
 * Computes the cross product of two vec2's (scalar result)
 */
export function cross(a: number[], b: number[]): number {
    return a[0] * b[1] - a[1] * b[0];
}

/**
 * Performs a linear interpolation between two vec2's
 */
export function lerp(out: number[], a: number[], b: number[], t: number): number[] {
    const ax = a[0];
    const ay = a[1];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    return out;
}

/**
 * Frame-rate independent interpolation (smooth lerp)
 */
export function smoothLerp(out: number[], a: number[], b: number[], decay: number, dt: number): number[] {
    const exp = Math.exp(-decay * dt);
    const ax = a[0];
    const ay = a[1];
    out[0] = b[0] + (ax - b[0]) * exp;
    out[1] = b[1] + (ay - b[1]) * exp;
    return out;
}

/**
 * Strict equality comparison
 */
export function exactEquals(a: number[], b: number[]): boolean {
    return a[0] === b[0] && a[1] === b[1];
}
