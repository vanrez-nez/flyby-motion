import * as Vector2Fn from './Vector2Fn';

export class Vector2 extends Array<number> {
    constructor(x: number = 0, y: number = x) {
        super(2);
        this[0] = x;
        this[1] = y;
        return this;
    }

    get x(): number {
        return this[0];
    }

    get y(): number {
        return this[1];
    }

    set x(v: number) {
        this[0] = v;
    }

    set y(v: number) {
        this[1] = v;
    }

    set(x: number | number[], y: number = (x as number)): Vector2 {
        if (Array.isArray(x)) return this.copy(x);
        Vector2Fn.set(this, x as number, y);
        return this;
    }

    copy(v: number[]): Vector2 {
        Vector2Fn.copy(this, v);
        return this;
    }

    add(va: number[], vb?: number[]): Vector2 {
        if (vb) Vector2Fn.add(this, va, vb);
        else Vector2Fn.add(this, this, va);
        return this;
    }

    sub(va: number[], vb?: number[]): Vector2 {
        if (vb) Vector2Fn.subtract(this, va, vb);
        else Vector2Fn.subtract(this, this, va);
        return this;
    }

    multiply(v: number | number[]): Vector2 {
        if (Array.isArray(v)) Vector2Fn.multiply(this, this, v as number[]);
        else Vector2Fn.scale(this, this, v as number);
        return this;
    }

    divide(v: number | number[]): Vector2 {
        if (Array.isArray(v)) Vector2Fn.divide(this, this, v as number[]);
        else Vector2Fn.scale(this, this, 1 / (v as number));
        return this;
    }

    inverse(v: number[] = this): Vector2 {
        Vector2Fn.inverse(this, v);
        return this;
    }

    len(): number {
        return Vector2Fn.length(this);
    }

    distance(v?: number[]): number {
        if (v) return Vector2Fn.distance(this, v);
        else return Vector2Fn.length(this);
    }

    squaredLen(): number {
        return this.squaredDistance(this);
    }

    squaredDistance(v?: number[]): number {
        if (v) return Vector2Fn.squaredDistance(this, v);
        else return Vector2Fn.squaredLength(this);
    }

    negate(v: number[] = this): Vector2 {
        Vector2Fn.negate(this, v);
        return this;
    }

    cross(va: number[], vb?: number[]): number {
        if (vb) return Vector2Fn.cross(va, vb);
        return Vector2Fn.cross(this, va);
    }

    scale(v: number): Vector2 {
        Vector2Fn.scale(this, this, v);
        return this;
    }

    normalize(): Vector2 {
        Vector2Fn.normalize(this, this);
        return this;
    }

    dot(v: number[]): number {
        return Vector2Fn.dot(this, v);
    }

    equals(v: number[]): boolean {
        return Vector2Fn.exactEquals(this, v);
    }

    lerp(v: number[], a: number): Vector2 {
        Vector2Fn.lerp(this, this, v, a);
        return this;
    }

    smoothLerp(v: number[], decay: number, dt: number): Vector2 {
        Vector2Fn.smoothLerp(this, this, v, decay, dt);
        return this;
    }

    clone(): Vector2 {
        return new Vector2(this[0], this[1]);
    }

    fromArray(a: number[], o: number = 0): Vector2 {
        this[0] = a[o];
        this[1] = a[o + 1];
        return this;
    }

    toArray(a: number[] = [], o: number = 0): number[] {
        a[o] = this[0];
        a[o + 1] = this[1];
        return a;
    }
}
