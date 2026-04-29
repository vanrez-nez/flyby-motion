/**
 * Copy the values from one vec3 to another
 */
export function copy(out: number[], a: number[]): number[] {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
}

/**
 * Set the components of a vec3 to the given values
 */
export function set(out: number[], x: number, y: number, z: number): number[] {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
}

/**
 * Adds two vec3's
 */
export function add(out: number[], a: number[], b: number[]): number[] {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
}

/**
 * Subtracts vector b from vector a
 */
export function subtract(out: number[], a: number[], b: number[]): number[] {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
}

/**
 * Multiplies two vec3's
 */
export function multiply(out: number[], a: number[], b: number[]): number[] {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
}

/**
 * Divides two vec3's
 */
export function divide(out: number[], a: number[], b: number[]): number[] {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    return out;
}

/**
 * Scales a vec3 by a scalar number
 */
export function scale(out: number[], a: number[], b: number): number[] {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    return out;
}

/**
 * Calculates the euclidian distance between two vec3's
 */
export function distance(a: number[], b: number[]): number {
    const x = b[0] - a[0];
    const y = b[1] - a[1];
    const z = b[2] - a[2];
    return Math.sqrt(x * x + y * y + z * z);
}

/**
 * Calculates the squared euclidian distance between two vec3's
 */
export function squaredDistance(a: number[], b: number[]): number {
    const x = b[0] - a[0];
    const y = b[1] - a[1];
    const z = b[2] - a[2];
    return x * x + y * y + z * z;
}

/**
 * Calculates the length of a vec3
 */
export function length(a: number[]): number {
    const x = a[0];
    const y = a[1];
    const z = a[2];
    return Math.sqrt(x * x + y * y + z * z);
}

/**
 * Calculates the squared length of a vec3
 */
export function squaredLength(a: number[]): number {
    const x = a[0];
    const y = a[1];
    const z = a[2];
    return x * x + y * y + z * z;
}

/**
 * Negates the components of a vec3
 */
export function negate(out: number[], a: number[]): number[] {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    return out;
}

/**
 * Returns the inverse of the components of a vec3
 */
export function inverse(out: number[], a: number[]): number[] {
    out[0] = 1.0 / a[0];
    out[1] = 1.0 / a[1];
    out[2] = 1.0 / a[2];
    return out;
}

/**
 * Normalize a vec3
 */
export function normalize(out: number[], a: number[]): number[] {
    const x = a[0];
    const y = a[1];
    const z = a[2];
    let len = x * x + y * y + z * z;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
    }
    out[0] = a[0] * len;
    out[1] = a[1] * len;
    out[2] = a[2] * len;
    return out;
}

/**
 * Calculates the dot product of two vec3's
 */
export function dot(a: number[], b: number[]): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Computes the cross product of two vec3's
 */
export function cross(out: number[], a: number[], b: number[]): number[] {
    const ax = a[0], ay = a[1], az = a[2];
    const bx = b[0], by = b[1], bz = b[2];
    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
}

/**
 * Performs a linear interpolation between two vec3's
 */
export function lerp(out: number[], a: number[], b: number[], t: number): number[] {
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    return out;
}

/**
 * Frame-rate independent interpolation (smooth lerp)
 */
export function smoothLerp(out: number[], a: number[], b: number[], decay: number, dt: number): number[] {
    const exp = Math.exp(-decay * dt);
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    out[0] = b[0] + (ax - b[0]) * exp;
    out[1] = b[1] + (ay - b[1]) * exp;
    out[2] = b[2] + (az - b[2]) * exp;
    return out;
}

/**
 * Get the angle between two 3D vectors
 */
export function angle(a: number[], b: number[]): number {
    const tempA: number[] = [0, 0, 0];
    const tempB: number[] = [0, 0, 0];

    copy(tempA, a);
    copy(tempB, b);
    normalize(tempA, tempA);
    normalize(tempB, tempB);

    const cosine = dot(tempA, tempB);

    if (cosine > 1.0) {
        return 0;
    } else if (cosine < -1.0) {
        return Math.PI;
    } else {
        return Math.acos(cosine);
    }
}

/**
 * Strict equality comparison
 */
export function exactEquals(a: number[], b: number[]): boolean {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}
