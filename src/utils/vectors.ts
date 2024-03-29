import { Vector2, Vector3 } from "@babylonjs/core";

export class Vec2 extends Vector2 {

    static sorted(...vectors: Vec2[]): Vec2[] {
        return vectors.sort((a, b) => a.x - b.x || a.y - b.y);
    }

    constructor(x: Vector2 | number, y?: number) {
        if (typeof x === "number")
            super(x, y);
        else if (x instanceof Vector3)
            super(x.x, x.y);
        else
            throw Error(`Use an existing Vector2 or two numbers in the V2 constructor!`);
    }

    public *[Symbol.iterator]() {
        yield this.x;
        yield this.y;
    }

    public spread(): [number, number] {
        return [this.x, this.y];
    }

    public get xy(): [number, number] {
        return this.spread();
    }

    public round() {
        return V2(Math.round(this.x), Math.round(this.y));
    }

    public roundUp() {
        return V2(Math.ceil(this.x), Math.ceil(this.y));
    }

    public roundDown() {
        return V2(Math.floor(this.x), Math.floor(this.y));
    }

    /** Adds the specified amount to all directions of the vector
     * @param amount The amount to add to the vector
     * @returns A new vector with the added amount
     */
    public move(amount: number) {
        return V2(this.x, this.y).add(V2(amount, amount));
    }

    public toVec3(fill: number = 0, updataY: boolean = true) {
        if (updataY)
            return V3(this.x, fill, this.y);
        else
            return V3(this.x, this.y, fill);
    }

    public get gameFormat(): Vec3 {
        return this.toVec3().gameFormat;
    }

    public dist(other: Vec2) {
        return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
    }

    public min(other: Vec2) {
        return V2(Math.min(this.x, other.x), Math.min(this.y, other.y));
    }

    public max(other: Vec2) {
        return V2(Math.max(this.x, other.x), Math.max(this.y, other.y));
    }
}

export class Vec3 extends Vector3 {

    constructor(x: Vector3 | number, y?: number, z?: number) {
        if (typeof x === "number")
            super(x, y, z);
        else if (x instanceof Vector3)
            super(x.x, x.y, x.z);
        else
            throw Error(`Use an existing Vector3 or three numbers in the V3 constructor!`);
    }

    public *[Symbol.iterator]() {
        yield this.x;
        yield this.y;
        yield this.z;
    }

    public spread(): [number, number, number] {
        return [this.x, this.y, this.z];
    }

    public get xyz(): [number, number, number] { return this.spread(); }
    public get xy(): [number, number] { return [this.x, this.y]; }
    public get xz(): [number, number] { return [this.x, this.z]; }
    public get yz(): [number, number] { return [this.y, this.z]; }

    public round() {
        return V3(Math.round(this.x), Math.round(this.y), Math.round(this.z));
    }

    public roundUp() {
        return V3(Math.ceil(this.x), Math.ceil(this.y), Math.ceil(this.z));
    }

    public roundDown() {
        return V3(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z));
    }

    public move(amount: number) {
        return V3(this.x, this.y, this.z).add(V3(amount, amount, amount));
    }

    public get gameFormat() {
        return V3(this.x, this.y, -this.z);
    };

    public toVec2(xz: boolean = true) {
        if (xz)
            return V2(this.x, this.z);
        else
            return V2(this.x, this.y);
    }

}

export function V2(x: Vector2 | number, y?: number): Vec2 {
    return new Vec2(x, y);
}
export function V3(x: Vector3 | number, y?: number, z?: number): Vec3 {
    return new Vec3(x, y, z);
}