import * as Vector3Fn from './Vector3Fn';

export class Vector3 extends Array<number> {
    constructor(x: number = 0, y: number = x, z: number = x) {
        super(3);
        this[0] = x;
        this[1] = y;
        this[2] = z;
        return this;
    }

    get x(): number {
        return this[0];
    }

    get y(): number {
        return this[1];
    }

    get z(): number {
        return this[2];
    }

    set x(v: number) {
        this[0] = v;
    }

    set y(v: number) {
        this[1] = v;
    }

    set z(v: number) {
        this[2] = v;
    }

    set(x: number | number[], y: number = (x as number), z: number = (x as number)): Vector3 {
        if (Array.isArray(x)) return this.copy(x);
        Vector3Fn.set(this, x as number, y, z);
        return this;
    }

    copy(v: number[]): Vector3 {
        Vector3Fn.copy(this, v);
        return this;
    }

    add(va: number[], vb?: number[]): Vector3 {
        if (vb) Vector3Fn.add(this, va, vb);
        else Vector3Fn.add(this, this, va);
        return this;
    }

    sub(va: number[], vb?: number[]): Vector3 {
        if (vb) Vector3Fn.subtract(this, va, vb);
        else Vector3Fn.subtract(this, this, va);
        return this;
    }

    multiply(v: number | number[]): Vector3 {
        if (Array.isArray(v)) Vector3Fn.multiply(this, this, v as number[]);
        else Vector3Fn.scale(this, this, v as number);
        return this;
    }

    divide(v: number | number[]): Vector3 {
        if (Array.isArray(v)) Vector3Fn.divide(this, this, v as number[]);
        else Vector3Fn.scale(this, this, 1 / (v as number));
        return this;
    }

    inverse(v: number[] = this): Vector3 {
        Vector3Fn.inverse(this, v);
        return this;
    }

    len(): number {
        return Vector3Fn.length(this);
    }

    distance(v?: number[]): number {
        if (v) return Vector3Fn.distance(this, v);
        else return Vector3Fn.length(this);
    }

    squaredLen(): number {
        return Vector3Fn.squaredLength(this);
    }

    squaredDistance(v?: number[]): number {
        if (v) return Vector3Fn.squaredDistance(this, v);
        else return Vector3Fn.squaredLength(this);
    }

    negate(v: number[] = this): Vector3 {
        Vector3Fn.negate(this, v);
        return this;
    }

    cross(va: number[], vb?: number[]): Vector3 {
        if (vb) Vector3Fn.cross(this, va, vb);
        else Vector3Fn.cross(this, this, va);
        return this;
    }

    scale(v: number): Vector3 {
        Vector3Fn.scale(this, this, v);
        return this;
    }

    normalize(): Vector3 {
        Vector3Fn.normalize(this, this);
        return this;
    }

    dot(v: number[]): number {
        return Vector3Fn.dot(this, v);
    }

    equals(v: number[]): boolean {
        return Vector3Fn.exactEquals(this, v);
    }

    angle(v: number[]): number {
        return Vector3Fn.angle(this, v);
    }

    lerp(v: number[], t: number): Vector3 {
        Vector3Fn.lerp(this, this, v, t);
        return this;
    }

    smoothLerp(v: number[], decay: number, dt: number): Vector3 {
        Vector3Fn.smoothLerp(this, this, v, decay, dt);
        return this;
    }

    clone(): Vector3 {
        return new Vector3(this[0], this[1], this[2]);
    }

    fromArray(a: number[], o: number = 0): Vector3 {
        this[0] = a[o];
        this[1] = a[o + 1];
        this[2] = a[o + 2];
        return this;
    }

    toArray(a: number[] = [], o: number = 0): number[] {
        a[o] = this[0];
        a[o + 1] = this[1];
        a[o + 2] = this[2];
        return a;
    }
}
